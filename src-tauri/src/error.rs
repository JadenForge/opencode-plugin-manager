use serde::Serialize;
use std::fmt;

pub type CmdResult<T> = Result<T, CmdError>;

#[derive(Debug, Serialize)]
pub struct CmdError {
    message: String,
}

impl fmt::Display for CmdError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for CmdError {}

impl From<std::io::Error> for CmdError {
    fn from(e: std::io::Error) -> Self {
        CmdError {
            message: format!("IO error: {}", e),
        }
    }
}

impl From<serde_json::Error> for CmdError {
    fn from(e: serde_json::Error) -> Self {
        CmdError {
            message: format!("JSON error: {}", e),
        }
    }
}

impl From<String> for CmdError {
    fn from(msg: String) -> Self {
        CmdError { message: msg }
    }
}

impl From<&str> for CmdError {
    fn from(msg: &str) -> Self {
        CmdError {
            message: msg.to_owned(),
        }
    }
}
