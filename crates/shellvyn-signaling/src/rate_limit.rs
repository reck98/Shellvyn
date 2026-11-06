//! IP-based token bucket rate limiter for Shellvyn pairing attempts
//!
//! Mitigates online brute-force attacks against the 40-bit Crockford Base32 pairing space.

use dashmap::DashMap;
use std::net::IpAddr;
use std::time::{Duration, Instant};
use tracing::warn;

pub const MAX_FAILED_ATTEMPTS: usize = 3;
pub const LOCKOUT_DURATION: Duration = Duration::from_secs(15 * 60); // 15 minutes

#[derive(Default)]
pub struct RateLimiter {
    failed_attempts: DashMap<IpAddr, Vec<Instant>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            failed_attempts: DashMap::new(),
        }
    }

    /// Checks if the given IP address is currently locked out.
    pub fn is_locked_out(&self, ip: &IpAddr) -> bool {
        let now = Instant::now();
        if let Some(mut attempts) = self.failed_attempts.get_mut(ip) {
            // Evict attempts older than the lockout window
            attempts.retain(|&time| now.duration_since(time) < LOCKOUT_DURATION);
            if attempts.len() >= MAX_FAILED_ATTEMPTS {
                warn!(ip = %ip, attempts = attempts.len(), "IP address is currently rate-limited");
                return true;
            }
        }
        false
    }

    /// Records a failed pairing attempt for the given IP address.
    pub fn record_failure(&self, ip: IpAddr) {
        let now = Instant::now();
        let mut entry = self.failed_attempts.entry(ip).or_default();
        entry.retain(|&time| now.duration_since(time) < LOCKOUT_DURATION);
        entry.push(now);
    }

    /// Clears any recorded failures for an IP upon successful session authentication.
    pub fn record_success(&self, ip: &IpAddr) {
        self.failed_attempts.remove(ip);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::Ipv4Addr;

    #[test]
    fn test_rate_limiter_lockout() {
        let limiter = RateLimiter::new();
        let ip = IpAddr::V4(Ipv4Addr::new(192, 168, 1, 100));

        assert!(!limiter.is_locked_out(&ip));

        limiter.record_failure(ip);
        assert!(!limiter.is_locked_out(&ip));

        limiter.record_failure(ip);
        assert!(!limiter.is_locked_out(&ip));

        limiter.record_failure(ip);
        // Third failure triggers lockout
        assert!(limiter.is_locked_out(&ip));

        // Successful authentication clears failures
        limiter.record_success(&ip);
        assert!(!limiter.is_locked_out(&ip));
    }
}
