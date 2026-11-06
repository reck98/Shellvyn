//! Shellvyn Pseudo-Terminal (PTY) Abstraction
//!
//! Provides a cross-platform interface for spawning and managing interactive
//! terminal sessions (Windows ConPTY and Linux POSIX PTY).

use bytes::Bytes;
use thiserror::Error;
use tokio::sync::mpsc;

#[derive(Error, Debug)]
pub enum PtyError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("ConPTY error: {0}")]
    ConPty(String),

    #[error("POSIX PTY error: {0}")]
    Posix(String),

    #[error("Process exited with code: {0:?}")]
    ProcessExited(Option<u32>),

    #[error("PTY channel closed: {0}")]
    ChannelClosed(String),

    #[error("PTY error: {0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, PtyError>;

/// Terminal window size in columns and rows.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Winsize {
    pub cols: u16,
    pub rows: u16,
}

impl Default for Winsize {
    fn default() -> Self {
        Self { cols: 80, rows: 24 }
    }
}

/// Supported shell types to spawn.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ShellType {
    PowerShell,
    Cmd,
    Bash,
    Zsh,
    Custom(String),
    Default,
}

impl ShellType {
    /// Returns the recommended default shell for the current operating system.
    pub fn default_for_os() -> Self {
        #[cfg(windows)]
        {
            Self::PowerShell
        }
        #[cfg(not(windows))]
        {
            Self::Default
        }
    }
}

/// Abstract representation of an active interactive terminal session.
pub trait TerminalSession: Send + Sync {
    /// Sends input data (keystrokes) to the terminal stdin.
    fn send_input(&self, data: Bytes) -> Result<()>;

    /// Resizes the pseudo-terminal window dimensions.
    fn resize(&self, size: Winsize) -> Result<()>;

    /// Checks if the underlying subprocess is still running.
    fn is_alive(&self) -> bool;

    /// Terminates the terminal subprocess and closes PTY resources.
    fn terminate(&mut self) -> Result<()>;
}

#[cfg(windows)]
pub mod conpty;

#[cfg(unix)]
pub mod posix;

/// Spawns an interactive terminal session appropriate for the current platform.
///
/// On Windows, invokes the Windows ConPTY subsystem.
/// On Linux/macOS, invokes the POSIX openpty subsystem.
pub fn spawn_terminal(
    shell: ShellType,
    initial_size: Winsize,
) -> Result<(Box<dyn TerminalSession>, mpsc::Receiver<Bytes>)> {
    #[cfg(windows)]
    {
        let (session, rx) = conpty::ConPtySession::spawn(shell, initial_size)?;
        Ok((Box::new(session), rx))
    }

    #[cfg(unix)]
    {
        let (session, rx) = posix::PosixPtySession::spawn(shell, initial_size)?;
        Ok((Box::new(session), rx))
    }

    #[cfg(not(any(windows, unix)))]
    {
        Err(PtyError::Other("Unsupported operating system for PTY".into()))
    }
}
