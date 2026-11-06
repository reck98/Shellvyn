//! Linux / POSIX openpty implementation
//!
//! Provides an interactive terminal session backed by POSIX pseudo-terminals
//! (openpty, login_tty, fork-exec, TIOCSWINSZ).

use crate::{PtyError, Result, ShellType, TerminalSession, Winsize};
use bytes::Bytes;
use std::env;
use std::os::unix::io::{AsRawFd, FromRawFd, OwnedFd, RawFd};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use tokio::sync::mpsc;
use tracing::{debug, error, info};

use nix::libc;
use nix::pty::{openpty, Winsize as NixWinsize};
use nix::sys::signal::{kill, Signal};
use nix::sys::wait::{waitpid, WaitPidFlag, WaitStatus};
use nix::unistd::{close, dup2, execvp, fork, setsid, ForkResult, Pid};

/// An active POSIX PTY terminal session.
pub struct PosixPtySession {
    master_fd: RawFd,
    child_pid: Pid,
    is_alive: Arc<AtomicBool>,
    terminated: bool,
}

unsafe impl Send for PosixPtySession {}
unsafe impl Sync for PosixPtySession {}

impl PosixPtySession {
    /// Spawns a new interactive shell session hosted inside a POSIX PTY.
    pub fn spawn(
        shell: ShellType,
        initial_size: Winsize,
    ) -> Result<(Self, mpsc::Receiver<Bytes>)> {
        debug!(?shell, ?initial_size, "Spawning POSIX PTY session");

        let nix_winsize = NixWinsize {
            ws_row: initial_size.rows,
            ws_col: initial_size.cols,
            ws_xpixel: 0,
            ws_ypixel: 0,
        };

        // 1. Allocate pseudo-terminal master and slave file descriptors
        let pty_pair = openpty(Some(&nix_winsize), None)
            .map_err(|e| PtyError::Posix(format!("openpty failed: {}", e)))?;

        let master_fd = pty_pair.master.as_raw_fd();
        let slave_fd = pty_pair.slave.as_raw_fd();

        // 2. Resolve shell command
        let shell_cmd = match shell {
            ShellType::Bash => "/bin/bash".to_string(),
            ShellType::Zsh => "/bin/zsh".to_string(),
            ShellType::Default | ShellType::PowerShell | ShellType::Cmd => {
                env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
            }
            ShellType::Custom(custom) => custom,
        };

        // 3. Fork process
        match unsafe { fork() } {
            Ok(ForkResult::Child) => {
                // In child process:
                // Close master
                let _ = close(master_fd);

                // Create new session
                let _ = setsid();

                // Set controlling terminal and duplicate slave to stdin, stdout, stderr
                unsafe {
                    libc::ioctl(slave_fd, libc::TIOCSCTTY as _, 0);
                }
                let _ = dup2(slave_fd, libc::STDIN_FILENO);
                let _ = dup2(slave_fd, libc::STDOUT_FILENO);
                let _ = dup2(slave_fd, libc::STDERR_FILENO);
                if slave_fd > libc::STDERR_FILENO {
                    let _ = close(slave_fd);
                }

                // Setup environment
                env::set_var("TERM", "xterm-256color");

                use std::ffi::CString;
                let c_cmd = CString::new(shell_cmd.as_str()).unwrap_or_default();
                let args = [c_cmd.as_c_str()];
                let _ = execvp(&c_cmd, &args);

                // If exec fails, exit child immediately
                unsafe { libc::_exit(1) };
            }
            Ok(ForkResult::Parent { child }) => {
                // In parent process:
                // Close slave fd
                let _ = close(slave_fd);
                // Keep ownership of master fd
                // We'll manage master_fd explicitly

                info!(pid = child.as_raw(), shell = %shell_cmd, "POSIX PTY process spawned");

                let is_alive = Arc::new(AtomicBool::new(true));
                let (tx_output, rx_output) = mpsc::channel::<Bytes>(1024);

                let reader_alive = Arc::clone(&is_alive);
                thread::Builder::new()
                    .name("shellvyn-posix-pty-reader".into())
                    .spawn(move || {
                        let mut buffer = [0u8; 8192];
                        loop {
                            let n = unsafe {
                                libc::read(
                                    master_fd,
                                    buffer.as_mut_ptr() as *mut libc::c_void,
                                    buffer.len(),
                                )
                            };

                            if n <= 0 {
                                debug!("POSIX PTY master read EOF / error");
                                break;
                            }

                            let chunk = Bytes::copy_from_slice(&buffer[..n as usize]);
                            if tx_output.blocking_send(chunk).is_err() {
                                break;
                            }
                        }

                        reader_alive.store(false, Ordering::SeqCst);
                        let _ = close(master_fd);
                    })
                    .map_err(|e| PtyError::Other(format!("Failed to spawn reader thread: {}", e)))?;

                let session = Self {
                    master_fd,
                    child_pid: child,
                    is_alive,
                    terminated: false,
                };

                Ok((session, rx_output))
            }
            Err(e) => {
                let _ = close(master_fd);
                let _ = close(slave_fd);
                Err(PtyError::Posix(format!("fork failed: {}", e)))
            }
        }
    }
}

impl TerminalSession for PosixPtySession {
    fn send_input(&self, data: Bytes) -> Result<()> {
        if !self.is_alive() {
            return Err(PtyError::ProcessExited(None));
        }

        let mut offset = 0;
        while offset < data.len() {
            let written = unsafe {
                libc::write(
                    self.master_fd,
                    data[offset..].as_ptr() as *const libc::c_void,
                    data.len() - offset,
                )
            };

            if written <= 0 {
                return Err(PtyError::Io(std::io::Error::last_os_error()));
            }

            offset += written as usize;
        }

        Ok(())
    }

    fn resize(&self, size: Winsize) -> Result<()> {
        let ws = libc::winsize {
            ws_row: size.rows,
            ws_col: size.cols,
            ws_xpixel: 0,
            ws_ypixel: 0,
        };

        let ret = unsafe { libc::ioctl(self.master_fd, libc::TIOCSWINSZ, &ws) };
        if ret != 0 {
            return Err(PtyError::Io(std::io::Error::last_os_error()));
        }

        Ok(())
    }

    fn is_alive(&self) -> bool {
        if !self.is_alive.load(Ordering::SeqCst) {
            return false;
        }

        match waitpid(self.child_pid, Some(WaitPidFlag::WNOHANG)) {
            Ok(WaitStatus::StillAlive) => true,
            _ => {
                self.is_alive.store(false, Ordering::SeqCst);
                false
            }
        }
    }

    fn terminate(&mut self) -> Result<()> {
        if self.terminated {
            return Ok(());
        }
        self.terminated = true;
        self.is_alive.store(false, Ordering::SeqCst);

        debug!(pid = self.child_pid.as_raw(), "Terminating POSIX PTY process");

        let _ = kill(self.child_pid, Signal::SIGTERM);
        let _ = waitpid(self.child_pid, Some(WaitPidFlag::WNOHANG));
        let _ = close(self.master_fd);

        Ok(())
    }
}

impl Drop for PosixPtySession {
    fn drop(&mut self) {
        let _ = self.terminate();
    }
}
