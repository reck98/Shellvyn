//! Windows ConPTY implementation
//!
//! Provides a PseudoConsole backed interactive terminal session using the
//! Windows ConPTY API (available on Windows 10 build 17763+ and Windows 11).

use crate::{PtyError, Result, ShellType, TerminalSession, Winsize};
use bytes::Bytes;
use std::ffi::c_void;
use std::mem;
use std::ptr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use tokio::sync::mpsc;
use tracing::{debug, info};

use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE, S_OK};
use windows_sys::Win32::Storage::FileSystem::{ReadFile, WriteFile};
use windows_sys::Win32::System::Console::{
    ClosePseudoConsole, CreatePseudoConsole, ResizePseudoConsole, COORD, HPCON,
};
use windows_sys::Win32::System::Pipes::CreatePipe;
use windows_sys::Win32::System::Threading::{
    CreateProcessW, DeleteProcThreadAttributeList, GetExitCodeProcess,
    InitializeProcThreadAttributeList, TerminateProcess, UpdateProcThreadAttribute,
    CREATE_UNICODE_ENVIRONMENT, EXTENDED_STARTUPINFO_PRESENT, PROCESS_INFORMATION,
    STARTF_USESTDHANDLES, STARTUPINFOEXW,
};

/// Win32 constant for PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE:
/// ProcThreadAttributeValue(22, FALSE, TRUE, FALSE) = 0x20016
const PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE: usize = 0x20016;

/// Win32 exit code returned by GetExitCodeProcess when process is still running
const STILL_ACTIVE: u32 = 259;

/// Send-safe handle stored as an integer address
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct SafeHandle(usize);

impl SafeHandle {
    fn new(h: HANDLE) -> Self {
        Self(h as usize)
    }

    fn as_handle(&self) -> HANDLE {
        self.0 as HANDLE
    }

    fn is_invalid(&self) -> bool {
        self.as_handle() == INVALID_HANDLE_VALUE
    }
}

/// An active Windows ConPTY terminal session.
pub struct ConPtySession {
    hpc: usize,
    h_process: SafeHandle,
    h_pipe_in_write: Arc<Mutex<SafeHandle>>,
    is_alive: Arc<AtomicBool>,
    terminated: bool,
}

unsafe impl Send for ConPtySession {}
unsafe impl Sync for ConPtySession {}

impl ConPtySession {
    /// Spawns a new interactive shell session hosted inside a Windows ConPTY.
    ///
    /// Returns the session controller and an asynchronous channel receiver
    /// that yields terminal output byte chunks as they are emitted by the shell.
    pub fn spawn(
        shell: ShellType,
        initial_size: Winsize,
    ) -> Result<(Self, mpsc::Receiver<Bytes>)> {
        debug!(?shell, ?initial_size, "Spawning Windows ConPTY session");

        let mut h_pipe_in_read: HANDLE = INVALID_HANDLE_VALUE;
        let mut h_pipe_in_write: HANDLE = INVALID_HANDLE_VALUE;
        let mut h_pipe_out_read: HANDLE = INVALID_HANDLE_VALUE;
        let mut h_pipe_out_write: HANDLE = INVALID_HANDLE_VALUE;

        // 1. Create anonymous pipe pairs for stdin and stdout
        unsafe {
            if CreatePipe(&mut h_pipe_in_read, &mut h_pipe_in_write, ptr::null(), 0) == 0 {
                return Err(PtyError::ConPty(format!(
                    "Failed to create stdin pipe: error {}",
                    std::io::Error::last_os_error()
                )));
            }
            if CreatePipe(&mut h_pipe_out_read, &mut h_pipe_out_write, ptr::null(), 0) == 0 {
                CloseHandle(h_pipe_in_read);
                CloseHandle(h_pipe_in_write);
                return Err(PtyError::ConPty(format!(
                    "Failed to create stdout pipe: error {}",
                    std::io::Error::last_os_error()
                )));
            }
        }

        // 2. Initialize the Windows PseudoConsole
        let mut hpc: HPCON = 0;
        let coord = COORD {
            X: initial_size.cols as i16,
            Y: initial_size.rows as i16,
        };

        let hr = unsafe {
            CreatePseudoConsole(coord, h_pipe_in_read, h_pipe_out_write, 0, &mut hpc)
        };

        // PseudoConsole duplicates the handles; close the child ends in parent process
        unsafe {
            CloseHandle(h_pipe_in_read);
            CloseHandle(h_pipe_out_write);
        }

        if hr != S_OK {
            unsafe {
                CloseHandle(h_pipe_in_write);
                CloseHandle(h_pipe_out_read);
            }
            return Err(PtyError::ConPty(format!(
                "CreatePseudoConsole failed with HRESULT 0x{:08X}",
                hr
            )));
        }

        // 3. Prepare STARTUPINFOEXW with PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE
        let mut attr_size: usize = 0;
        unsafe {
            InitializeProcThreadAttributeList(ptr::null_mut(), 1, 0, &mut attr_size);
        }

        let mut attr_list = vec![0u8; attr_size];
        let p_attr_list = attr_list.as_mut_ptr() as *mut c_void;

        unsafe {
            if InitializeProcThreadAttributeList(p_attr_list, 1, 0, &mut attr_size) == 0 {
                ClosePseudoConsole(hpc);
                CloseHandle(h_pipe_in_write);
                CloseHandle(h_pipe_out_read);
                return Err(PtyError::ConPty(format!(
                    "InitializeProcThreadAttributeList failed: {}",
                    std::io::Error::last_os_error()
                )));
            }

            if UpdateProcThreadAttribute(
                p_attr_list,
                0,
                PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE,
                hpc as *const c_void,
                mem::size_of::<HPCON>(),
                ptr::null_mut(),
                ptr::null_mut(),
            ) == 0
            {
                DeleteProcThreadAttributeList(p_attr_list);
                ClosePseudoConsole(hpc);
                CloseHandle(h_pipe_in_write);
                CloseHandle(h_pipe_out_read);
                return Err(PtyError::ConPty(format!(
                    "UpdateProcThreadAttribute failed: {}",
                    std::io::Error::last_os_error()
                )));
            }
        }

        let mut si_ex: STARTUPINFOEXW = unsafe { mem::zeroed() };
        si_ex.StartupInfo.cb = mem::size_of::<STARTUPINFOEXW>() as u32;
        // Explicitly set STARTF_USESTDHANDLES with INVALID_HANDLE_VALUE to force child process
        // to bind exclusively to the PseudoConsole attribute and not inherit the parent console's stdio!
        si_ex.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
        si_ex.StartupInfo.hStdInput = INVALID_HANDLE_VALUE;
        si_ex.StartupInfo.hStdOutput = INVALID_HANDLE_VALUE;
        si_ex.StartupInfo.hStdError = INVALID_HANDLE_VALUE;
        si_ex.lpAttributeList = p_attr_list;

        // 4. Resolve shell command line
        let cmd = match shell {
            ShellType::PowerShell | ShellType::Default => {
                "powershell.exe -NoLogo".to_string()
            }
            ShellType::Cmd => "cmd.exe".to_string(),
            ShellType::Custom(custom) => custom,
            ShellType::Bash => "bash.exe".to_string(),
            ShellType::Zsh => "zsh.exe".to_string(),
        };

        let mut cmd_utf16: Vec<u16> = cmd.encode_utf16().chain(Some(0)).collect();
        let mut pi: PROCESS_INFORMATION = unsafe { mem::zeroed() };

        // 5. Spawn child process attached to PseudoConsole
        let success = unsafe {
            CreateProcessW(
                ptr::null(),
                cmd_utf16.as_mut_ptr(),
                ptr::null(),
                ptr::null(),
                0, // Do NOT inherit parent handles
                EXTENDED_STARTUPINFO_PRESENT | CREATE_UNICODE_ENVIRONMENT,
                ptr::null(),
                ptr::null(),
                &si_ex.StartupInfo,
                &mut pi,
            )
        };

        unsafe {
            DeleteProcThreadAttributeList(p_attr_list);
        }

        if success == 0 {
            unsafe {
                ClosePseudoConsole(hpc);
                CloseHandle(h_pipe_in_write);
                CloseHandle(h_pipe_out_read);
            }
            return Err(PtyError::ConPty(format!(
                "Failed to spawn shell '{}': {}",
                cmd,
                std::io::Error::last_os_error()
            )));
        }

        unsafe {
            CloseHandle(pi.hThread);
        }

        info!(pid = pi.dwProcessId, cmd = %cmd, "ConPTY process spawned successfully");

        let is_alive = Arc::new(AtomicBool::new(true));
        let (tx_output, rx_output) = mpsc::channel::<Bytes>(1024);

        // 6. Spawn dedicated background reader thread for stdout
        let reader_alive = Arc::clone(&is_alive);
        let out_fd_val = h_pipe_out_read as usize;
        thread::Builder::new()
            .name("shellvyn-conpty-reader".into())
            .spawn(move || {
                let h_out = out_fd_val as HANDLE;
                let mut buffer = [0u8; 8192];
                loop {
                    let mut bytes_read: u32 = 0;
                    let ok = unsafe {
                        ReadFile(
                            h_out,
                            buffer.as_mut_ptr(),
                            buffer.len() as u32,
                            &mut bytes_read,
                            ptr::null_mut(),
                        )
                    };

                    if ok == 0 || bytes_read == 0 {
                        debug!("ConPTY output pipe EOF / closed");
                        break;
                    }

                    let chunk = Bytes::copy_from_slice(&buffer[..bytes_read as usize]);
                    if tx_output.blocking_send(chunk).is_err() {
                        debug!("ConPTY output receiver channel closed; exiting reader thread");
                        break;
                    }
                }

                reader_alive.store(false, Ordering::SeqCst);
                unsafe {
                    CloseHandle(h_out);
                }
            })
            .map_err(|e| PtyError::Other(format!("Failed to spawn reader thread: {}", e)))?;

        let session = Self {
            hpc: hpc as usize,
            h_process: SafeHandle::new(pi.hProcess),
            h_pipe_in_write: Arc::new(Mutex::new(SafeHandle::new(h_pipe_in_write))),
            is_alive,
            terminated: false,
        };

        Ok((session, rx_output))
    }
}

impl TerminalSession for ConPtySession {
    fn send_input(&self, data: Bytes) -> Result<()> {
        if !self.is_alive() {
            return Err(PtyError::ProcessExited(None));
        }

        let guard = self
            .h_pipe_in_write
            .lock()
            .map_err(|_| PtyError::Other("Stdin mutex poisoned".into()))?;

        if guard.is_invalid() {
            return Err(PtyError::ChannelClosed("Stdin handle closed".into()));
        }

        let mut bytes_written: u32 = 0;
        let ok = unsafe {
            WriteFile(
                guard.as_handle(),
                data.as_ptr(),
                data.len() as u32,
                &mut bytes_written,
                ptr::null_mut(),
            )
        };

        if ok == 0 {
            return Err(PtyError::Io(std::io::Error::last_os_error()));
        }

        Ok(())
    }

    fn resize(&self, size: Winsize) -> Result<()> {
        let coord = COORD {
            X: size.cols as i16,
            Y: size.rows as i16,
        };
        let hr = unsafe { ResizePseudoConsole(self.hpc as HPCON, coord) };
        if hr != S_OK {
            return Err(PtyError::ConPty(format!(
                "ResizePseudoConsole failed with HRESULT 0x{:08X}",
                hr
            )));
        }
        Ok(())
    }

    fn is_alive(&self) -> bool {
        if !self.is_alive.load(Ordering::SeqCst) {
            return false;
        }

        let mut exit_code: u32 = 0;
        let ok = unsafe { GetExitCodeProcess(self.h_process.as_handle(), &mut exit_code) };
        if ok == 0 || exit_code != STILL_ACTIVE {
            self.is_alive.store(false, Ordering::SeqCst);
            return false;
        }

        true
    }

    fn terminate(&mut self) -> Result<()> {
        if self.terminated {
            return Ok(());
        }
        self.terminated = true;
        self.is_alive.store(false, Ordering::SeqCst);

        debug!("Terminating ConPTY session and closing handles");

        unsafe {
            let mut exit_code: u32 = 0;
            if GetExitCodeProcess(self.h_process.as_handle(), &mut exit_code) != 0 && exit_code == STILL_ACTIVE {
                let _ = TerminateProcess(self.h_process.as_handle(), 1);
            }

            if let Ok(mut guard) = self.h_pipe_in_write.lock() {
                if !guard.is_invalid() {
                    CloseHandle(guard.as_handle());
                    *guard = SafeHandle::new(INVALID_HANDLE_VALUE);
                }
            }

            ClosePseudoConsole(self.hpc as HPCON);

            if !self.h_process.is_invalid() {
                CloseHandle(self.h_process.as_handle());
                self.h_process = SafeHandle::new(INVALID_HANDLE_VALUE);
            }
        }

        Ok(())
    }
}

impl Drop for ConPtySession {
    fn drop(&mut self) {
        let _ = self.terminate();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;
    use tokio::time::timeout;

    #[tokio::test]
    async fn test_conpty_spawn_and_output() {
        let (session, mut rx) = ConPtySession::spawn(
            ShellType::Cmd,
            Winsize { cols: 80, rows: 24 },
        )
        .expect("Failed to spawn ConPTY cmd session");

        assert!(session.is_alive());

        // Send a test command to cmd.exe
        let test_cmd = b"echo SHELLVYN_TEST_MAGIC\r\n";
        session
            .send_input(Bytes::from_static(test_cmd))
            .expect("Failed to send input to cmd");

        // Collect output until we find the magic string or timeout
        let mut collected = Vec::new();
        let timeout_result = timeout(Duration::from_secs(8), async {
            while let Some(chunk) = rx.recv().await {
                collected.extend_from_slice(&chunk);
                let text = String::from_utf8_lossy(&collected);
                if text.contains("SHELLVYN_TEST_MAGIC") {
                    return true;
                }
            }
            false
        })
        .await;

        assert!(
            timeout_result.unwrap_or(false),
            "Timed out waiting for 'SHELLVYN_TEST_MAGIC' in output: {}",
            String::from_utf8_lossy(&collected)
        );

        // Test resize
        assert!(session.resize(Winsize { cols: 120, rows: 40 }).is_ok());

        // Clean termination
        drop(session);
    }

    #[tokio::test]
    async fn test_conpty_powershell_spawn_and_output() {
        let (session, mut rx) = ConPtySession::spawn(
            ShellType::PowerShell,
            Winsize { cols: 80, rows: 24 },
        )
        .expect("Failed to spawn ConPTY PowerShell session");

        assert!(session.is_alive());

        // Send a test command to PowerShell
        let test_cmd = b"Write-Output 'PWSH_MAGIC_12345'\r\n";
        session
            .send_input(Bytes::from_static(test_cmd))
            .expect("Failed to send input to PowerShell");

        let mut collected = Vec::new();
        let timeout_result = timeout(Duration::from_secs(10), async {
            while let Some(chunk) = rx.recv().await {
                collected.extend_from_slice(&chunk);
                let text = String::from_utf8_lossy(&collected);
                if text.contains("PWSH_MAGIC_12345") {
                    return true;
                }
            }
            false
        })
        .await;

        assert!(
            timeout_result.unwrap_or(false),
            "Timed out waiting for 'PWSH_MAGIC_12345' in output: {}",
            String::from_utf8_lossy(&collected)
        );

        drop(session);
    }
}
