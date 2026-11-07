//! IP-based token bucket rate limiter for Shellvyn pairing attempts
//!
//! Mitigates online brute-force attacks against the 40-bit Crockford Base32 pairing space.

use dashmap::DashMap;
use std::net::IpAddr;
use std::time::{Duration, Instant};
use tracing::warn;

pub const MAX_FAILED_ATTEMPTS: usize = 5;
pub const LOCKOUT_DURATION: Duration = Duration::from_secs(5 * 60); // 5 minutes

fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => v4.is_private() || v4.is_link_local(),
        IpAddr::V6(v6) => v6.is_unique_local(),
    }
}

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
        // Never lock out private / internal cloud proxy networks
        if is_private_ip(ip) {
            return false;
        }

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
        if is_private_ip(&ip) {
            return;
        }

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
        let ip = IpAddr::V4(Ipv4Addr::new(93, 184, 216, 34)); // public IP (example.com)

        assert!(!limiter.is_locked_out(&ip));

        for _ in 0..MAX_FAILED_ATTEMPTS {
            limiter.record_failure(ip);
        }
        // Triggers lockout
        assert!(limiter.is_locked_out(&ip));

        // Private IP should never be locked out
        let private_ip = IpAddr::V4(Ipv4Addr::new(192, 168, 1, 100));
        for _ in 0..MAX_FAILED_ATTEMPTS + 5 {
            limiter.record_failure(private_ip);
        }
        assert!(!limiter.is_locked_out(&private_ip));

        // Successful authentication clears failures
        limiter.record_success(&ip);
        assert!(!limiter.is_locked_out(&ip));
    }
}
