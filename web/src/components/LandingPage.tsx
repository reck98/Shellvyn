import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Copy,
  Check,
  Terminal as TerminalIcon,
  Radio,
  ArrowRight,
  Laptop,
  ShieldCheck,
  KeyRound,
  Trash2,
  Download,
  Cpu,
  Lock,
  Activity,
  Layers,
  CheckCircle2,
  Menu,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { ShellvynLogo } from './ShellvynLogo';

interface LandingPageProps {
  pairingCode: string;
  setPairingCode: (code: string) => void;
  onConnect: (e?: React.FormEvent, directCode?: string) => void;
  onConnectLocal: () => void;
  recentCodes: string[];
  onClearRecentCodes: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeConsoleTab: 'join' | 'host';
  setActiveConsoleTab: (tab: 'join' | 'host') => void;
  installOs: 'windows' | 'linux' | 'cargo';
  setInstallOs: (os: 'windows' | 'linux' | 'cargo') => void;
  copiedSnippet: string | null;
  onCopySnippet: (text: string, id: string) => void;
  isValidPairingCode: (code: string) => boolean;
  normalizePairingCode: (code: string) => string;
  onOpenArchitecture?: () => void;
}

/** Official GitHub vector mark */
const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({
  pairingCode,
  setPairingCode,
  onConnect,
  onConnectLocal,
  recentCodes,
  onClearRecentCodes,
  theme,
  onToggleTheme,
  activeConsoleTab,
  setActiveConsoleTab,
  installOs,
  setInstallOs,
  copiedSnippet,
  onCopySnippet,
  isValidPairingCode,
  normalizePairingCode,
  onOpenArchitecture,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [releaseVersion, setReleaseVersion] = useState('v0.1.4');

  // Fetch the latest release tag from GitHub dynamically
  useEffect(() => {
    fetch('https://api.github.com/repos/reck98/Shellvyn/releases/latest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.tag_name) {
          setReleaseVersion(data.tag_name);
        }
      })
      .catch(() => {});
  }, []);

  // Ensure initial load starts at the top (Hero / Overview) rather than jumping down to console
  React.useEffect(() => {
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#overview') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-full flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased selection:bg-[var(--term-selection)]">
      {/* ====================================================================
          1. Global Navigation Bar (Compact, 56px / h-14)
          Strict Rule: GitHub button is located in the footer only.
          ==================================================================== */}
      <header className="sticky top-0 z-40 h-14 bg-[var(--bg-canvas)]/92 backdrop-blur-md border-b border-[var(--border-default)] transition-colors">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          {/* Brand Identity with Official Logo Asset */}
          <div className="flex items-center space-x-3">
            <a
              href="#overview"
              className="flex items-center space-x-2.5 focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] rounded py-1 px-1 -ml-1 transition-transform active:scale-[0.98]"
              aria-label="Shellvyn home"
            >
              <ShellvynLogo symbolSize="w-6 h-6" />
            </a>
            <a
              href="https://github.com/reck98/Shellvyn/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition select-none"
              title="View latest GitHub release"
            >
              {releaseVersion}
            </a>
          </div>

          {/* Desktop Anchor Navigation */}
          <nav
            className="hidden md:flex items-center space-x-7 text-xs font-mono text-[var(--text-secondary)]"
            aria-label="Main Navigation"
          >
            <a
              href="#overview"
              className="hover:text-[var(--text-primary)] transition-colors py-1 focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] rounded"
            >
              Overview
            </a>
            <a
              href="#connect"
              className="hover:text-[var(--text-primary)] transition-colors py-1 focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] rounded"
            >
              Console
            </a>
            <a
              href="#features"
              className="hover:text-[var(--text-primary)] transition-colors py-1 focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] rounded"
            >
              Features
            </a>
            <a
              href="#architecture"
              className="hover:text-[var(--text-primary)] transition-colors py-1 focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] rounded"
            >
              Architecture
            </a>
            <a
              href="#cli"
              className="hover:text-[var(--text-primary)] transition-colors py-1 focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] rounded"
            >
              CLI Reference
            </a>
          </nav>

          {/* Right Header Controls: Theme Toggle & Mobile Trigger */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] active:scale-95"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[var(--gold)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--accent)]" />
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] active:scale-95"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[var(--border-default)] bg-[var(--bg-canvas)] px-4 py-4 space-y-1 text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-150">
            <a
              href="#overview"
              onClick={closeMobileMenu}
              className="block px-3 py-2.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition"
            >
              Overview
            </a>
            <a
              href="#connect"
              onClick={closeMobileMenu}
              className="block px-3 py-2.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition"
            >
              Console & Session Join
            </a>
            <a
              href="#features"
              onClick={closeMobileMenu}
              className="block px-3 py-2.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition"
            >
              Features & Precision
            </a>
            <a
              href="#architecture"
              onClick={closeMobileMenu}
              className="block px-3 py-2.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition"
            >
              Zero-Knowledge Architecture
            </a>
            <a
              href="#cli"
              onClick={closeMobileMenu}
              className="block px-3 py-2.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition"
            >
              CLI Reference
            </a>
          </div>
        )}
      </header>

      {/* ====================================================================
          2. Hero Section
          Tagline: "Your terminal. Anywhere."
          Focus: Clear value proposition, strong typography, zero jargon slop.
          ==================================================================== */}
      <section
        id="overview"
        className="border-b border-[var(--border-default)] px-4 sm:px-6 pt-12 pb-14 md:pt-20 md:pb-20 max-w-6xl mx-auto w-full"
      >
        <div className="max-w-3xl space-y-5 text-left">
          {/* Restrained Technical Category Label */}
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-secondary)] select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>ZERO-KNOWLEDGE TERMINAL STREAMING</span>
          </div>

          {/* Core Brand Tagline Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.08]">
            Your terminal. Anywhere.
          </h1>

          {/* Technical Value Proposition */}
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            Stream your local Windows ConPTY or Linux PTY session directly to any web browser.
            Zero port-forwarding, zero cloud accounts, and zero software required for guests.
          </p>

          {/* Quick Actions & Technical Badges */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="#connect"
              onClick={() => setActiveConsoleTab('join')}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-mono font-medium transition shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] active:translate-y-px"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Join a Session</span>
            </a>

            <a
              href="#connect"
              onClick={() => setActiveConsoleTab('host')}
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-primary)] text-xs font-mono font-medium transition cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] active:translate-y-px"
            >
              <TerminalIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Host a Terminal</span>
            </a>
          </div>

          {/* Engineering Specifications Strip */}
          <div className="pt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
              <span>Windows ConPTY</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
              <span>Linux POSIX PTY</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]"></span>
              <span>ChaCha20-Poly1305 E2EE</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"></span>
              <span>Zero Cloud Logins</span>
            </span>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. Interactive Product Centerpiece: Console & Live Terminal Preview
          Preserves 100% of functional connection logic & real terminal aesthetics.
          ==================================================================== */}
      <section
        id="connect"
        className="border-b border-[var(--border-default)] px-4 sm:px-6 py-12 md:py-16 max-w-6xl mx-auto w-full space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Console (Join / Host) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 sm:p-6 shadow-sm space-y-5 transition-colors">
              {/* Segmented Mode Switcher */}
              <div
                className="flex bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-default)]"
                role="tablist"
                aria-label="Session Mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeConsoleTab === 'join'}
                  onClick={() => setActiveConsoleTab('join')}
                  className={`flex-1 py-2 text-xs font-mono font-medium rounded-md transition flex items-center justify-center space-x-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] ${
                    activeConsoleTab === 'join'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Join Session</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeConsoleTab === 'host'}
                  onClick={() => setActiveConsoleTab('host')}
                  className={`flex-1 py-2 text-xs font-mono font-medium rounded-md transition flex items-center justify-center space-x-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] ${
                    activeConsoleTab === 'host'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <TerminalIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Host a Terminal</span>
                </button>
              </div>

              {/* Tab 1: Join Session Form */}
              {activeConsoleTab === 'join' ? (
                <div className="space-y-4">
                  <form onSubmit={onConnect} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="pairing-input"
                          className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                        >
                          Pairing Code
                        </label>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          8-character Crockford Base32
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          id="pairing-input"
                          type="text"
                          value={pairingCode}
                          onChange={(e) => setPairingCode(normalizePairingCode(e.target.value))}
                          placeholder="XXXX-XXXX"
                          maxLength={9}
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full h-12 bg-[var(--bg-canvas)] border border-[var(--border-default)] focus:border-[var(--border-focus)] rounded-lg text-center text-xl font-mono tracking-widest text-[var(--text-primary)] focus:outline-none transition placeholder:text-[var(--text-muted)] uppercase"
                        />
                        {pairingCode && (
                          <button
                            type="button"
                            onClick={() => setPairingCode('')}
                            className="absolute right-3 top-3.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer px-1 py-0.5 rounded"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!isValidPairingCode(pairingCode)}
                      className="w-full min-h-[44px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-hover)] disabled:text-[var(--text-muted)] text-[var(--accent-contrast)] text-xs font-mono font-medium rounded-lg transition flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed shadow-xs active:translate-y-px"
                    >
                      <span>Connect to Host</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Recent Sessions */}
                  {recentCodes.length > 0 && (
                    <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
                        <span>Recent Sessions</span>
                        <button
                          type="button"
                          onClick={onClearRecentCodes}
                          className="hover:text-[var(--text-secondary)] transition cursor-pointer flex items-center space-x-1 text-[10px]"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentCodes.map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              setPairingCode(code);
                              onConnect(undefined, code);
                            }}
                            className="px-2.5 py-1 rounded-md bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer active:scale-95"
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Local Loopback Option */}
                  <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={onConnectLocal}
                      className="w-full min-h-[40px] bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono rounded-lg transition flex items-center justify-center space-x-2 cursor-pointer active:translate-y-px"
                    >
                      <Laptop className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Connect to Local PTY (127.0.0.1:3000)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Tab 2: Host a Terminal */
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        1. Install Host Agent
                      </span>
                      <div className="flex space-x-1 bg-[var(--bg-canvas)] p-0.5 rounded-md border border-[var(--border-default)]">
                        <button
                          type="button"
                          onClick={() => setInstallOs('windows')}
                          className={`px-2 py-0.5 text-[10px] rounded font-mono transition cursor-pointer ${
                            installOs === 'windows'
                              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-medium'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Windows
                        </button>
                        <button
                          type="button"
                          onClick={() => setInstallOs('linux')}
                          className={`px-2 py-0.5 text-[10px] rounded font-mono transition cursor-pointer ${
                            installOs === 'linux'
                              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-medium'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Linux
                        </button>
                        <button
                          type="button"
                          onClick={() => setInstallOs('cargo')}
                          className={`px-2 py-0.5 text-[10px] rounded font-mono transition cursor-pointer ${
                            installOs === 'cargo'
                              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-medium'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Cargo
                        </button>
                      </div>
                    </div>

                    {/* Snippet Card */}
                    <div className="relative bg-[var(--bg-canvas)] border border-[var(--border-default)] rounded-lg p-3 flex items-center justify-between">
                      <div className="overflow-x-auto text-left font-mono text-xs text-[var(--text-primary)] pr-8 py-0.5 scrollbar-thin">
                        {installOs === 'windows' && (
                          <code>irm https://raw.githubusercontent.com/reck98/Shellvyn/main/scripts/install-windows.ps1 | iex</code>
                        )}
                        {installOs === 'linux' && (
                          <code>curl -fsSL https://raw.githubusercontent.com/reck98/Shellvyn/main/scripts/install-linux.sh | bash</code>
                        )}
                        {installOs === 'cargo' && (
                          <code>cargo install --git https://github.com/reck98/Shellvyn shellvyn-agent</code>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cmd =
                            installOs === 'windows'
                              ? 'irm https://raw.githubusercontent.com/reck98/Shellvyn/main/scripts/install-windows.ps1 | iex'
                              : installOs === 'linux'
                              ? 'curl -fsSL https://raw.githubusercontent.com/reck98/Shellvyn/main/scripts/install-linux.sh | bash'
                              : 'cargo install --git https://github.com/reck98/Shellvyn shellvyn-agent';
                          onCopySnippet(cmd, 'install');
                        }}
                        className="absolute right-2 top-2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md"
                        title="Copy install command"
                      >
                        {copiedSnippet === 'install' ? (
                          <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      2. Share Your Shell
                    </span>
                    <div className="relative bg-[var(--bg-canvas)] border border-[var(--border-default)] rounded-lg p-3 flex items-center justify-between">
                      <code className="font-mono text-xs text-[var(--accent)] font-semibold">
                        shellvyn share
                      </code>
                      <button
                        type="button"
                        onClick={() => onCopySnippet('shellvyn share', 'share')}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md"
                        title="Copy command"
                      >
                        {copiedSnippet === 'share' ? (
                          <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      Launches your local PTY and registers an encrypted pairing code for your guest.
                    </p>
                  </div>

                  {/* Direct Downloads */}
                  <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                    <span className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Standalone Binary Archives
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href="https://github.com/reck98/Shellvyn/releases/latest/download/shellvyn-windows-x86_64.zip"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono transition"
                      >
                        <Download className="w-3 h-3 text-[var(--accent)]" />
                        <span>Windows (.exe)</span>
                      </a>
                      <a
                        href="https://github.com/reck98/Shellvyn/releases/latest/download/shellvyn-linux-x86_64.tar.gz"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono transition"
                      >
                        <Download className="w-3 h-3 text-[var(--accent)]" />
                        <span>Linux (x64)</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Terminal Session Demonstration */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
              <span className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[var(--success)] pulse-active"></span>
                <span className="text-[var(--text-secondary)] font-medium">Active Terminal Stream</span>
              </span>
              <span>Windows ConPTY / Linux PTY (80×24)</span>
            </div>

            {/* App Frame Terminal Mock */}
            <div className="app-frame rounded-xl overflow-hidden border border-[var(--border-default)] shadow-xl transition-all">
              {/* Window Titlebar */}
              <div className="h-9 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] px-3.5 flex items-center justify-between select-none">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/90 border border-black/10"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/90 border border-black/10"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/90 border border-black/10"></div>
                </div>
                <div className="text-[11px] font-mono text-[var(--text-secondary)] font-medium">
                  shellvyn-host &bull; ~/projects/api
                </div>
                <div className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-default)]">
                  E2EE &bull; ChaCha20
                </div>
              </div>

              {/* Terminal Screen Content */}
              <div className="p-4 sm:p-5 text-[11.5px] sm:text-xs font-mono leading-relaxed space-y-2 text-[var(--term-fg)] overflow-x-auto min-h-[320px]">
                <div>
                  <span className="text-[var(--gold)]">$</span> shellvyn share
                </div>
                <div className="text-[var(--text-muted)]">
                  [Shellvyn] Initialized ConPTY process: powershell.exe (PID 14280)
                </div>
                <div className="text-[var(--text-muted)]">
                  [Shellvyn] Derived 256-bit ChaCha20-Poly1305 session key
                </div>

                <div className="text-[var(--text-secondary)] py-1.5 border-y border-[var(--border-subtle)] my-2">
                  <div className="text-[var(--accent)] font-bold">╔══════════════════════════════════════════════════════════╗</div>
                  <div>║  PAIRING CODE : <span className="text-[var(--gold)] font-bold">K7M2-9XPQ</span>                                ║</div>
                  <div>║  BROWSER LINK : https://shellvyn.reck98.in/#K7M2-9XPQ   ║</div>
                  <div className="text-[var(--accent)] font-bold">╚══════════════════════════════════════════════════════════╝</div>
                </div>

                <div className="text-[var(--text-muted)]">
                  [Shellvyn] Incoming connection from 198.51.100.42 (Chrome/macOS)
                </div>
                <div>
                  <span className="text-[var(--gold)]">[Shellvyn] Approve connection? [y/N]:</span>{' '}
                  <span className="text-[var(--accent)] font-bold">y</span>
                </div>
                <div className="text-[var(--success)]">
                  [Shellvyn] Connection approved. Live interactive terminal streaming.
                </div>

                <div className="pt-2 text-[var(--term-fg)]">
                  <span className="text-[var(--accent)]">guest@devbox</span>:
                  <span className="text-[var(--gold)]">~/projects/api</span>$ cargo test --quiet
                </div>
                <div className="text-[var(--text-secondary)]">
                  running 25 tests ... 25 passed; 0 failed; finished in 0.42s
                </div>
                <div className="text-[var(--term-fg)] flex items-center space-x-1">
                  <span>
                    <span className="text-[var(--accent)]">guest@devbox</span>:
                    <span className="text-[var(--gold)]">~/projects/api</span>$
                  </span>
                  <span className="terminal-cursor"></span>
                </div>
              </div>

              {/* Statusbar */}
              <div className="h-7 bg-[var(--bg-subtle)] border-t border-[var(--border-default)] px-3.5 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] select-none">
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--success)]"></span>
                  <span>Relay Channel Active (shellvyn-signaling.onrender.com)</span>
                </div>
                <div>ChaCha20-Poly1305 &bull; 14ms latency</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. Features Section
          Accurate, meaningful capabilities without repetitive card bloat.
          ==================================================================== */}
      <section
        id="features"
        className="border-b border-[var(--border-default)] px-4 sm:px-6 py-14 md:py-20 max-w-6xl mx-auto w-full space-y-10"
      >
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-secondary)]">
            <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>CORE CAPABILITIES</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Engineered for Developer Precision
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Built in Rust for native speed, zero latency overhead, and endpoint privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 space-y-2.5 transition-colors hover:border-[var(--border-focus)]/60">
            <div className="flex items-center space-x-2.5 text-[var(--text-primary)] font-semibold text-sm">
              <Cpu className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>True OS ConPTY Integration</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Not a synthetic browser terminal emulator. Directly launches PowerShell, Command Prompt, or Bash with authentic operating system process encapsulation.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 space-y-2.5 transition-colors hover:border-[var(--border-focus)]/60">
            <div className="flex items-center space-x-2.5 text-[var(--text-primary)] font-semibold text-sm">
              <Lock className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>Host-Controlled Authorization</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Hosts receive explicit [y/N] interactive terminal prompts showing remote IP and client agent before granting terminal access, preventing rogue attachments.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 space-y-2.5 transition-colors hover:border-[var(--border-focus)]/60">
            <div className="flex items-center space-x-2.5 text-[var(--text-primary)] font-semibold text-sm">
              <Activity className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>Zero Firewall Configuration</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Outbound TLS WebSocket connections traverse strict NATs, VPNs, and corporate firewalls without configuring port-forwarding or public IP addresses.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 space-y-2.5 transition-colors hover:border-[var(--border-focus)]/60">
            <div className="flex items-center space-x-2.5 text-[var(--text-primary)] font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>Read-Only Sharing Mode</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Start sessions with <code className="px-1 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-default)] font-mono text-[11px]">--read-only</code> to allow guests to observe live output while completely restricting keystroke transmission.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 space-y-2.5 transition-colors hover:border-[var(--border-focus)]/60">
            <div className="flex items-center space-x-2.5 text-[var(--text-primary)] font-semibold text-sm">
              <KeyRound className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>Brute Force Rate Limiter</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              The signaling relay enforces a 15-minute IP lockout after 5 invalid pairing attempts, securing the 40-bit Crockford Base32 pairing code entropy space.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 space-y-2.5 transition-colors hover:border-[var(--border-focus)]/60">
            <div className="flex items-center space-x-2.5 text-[var(--text-primary)] font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>Zero Guest Software</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Collaborators only need a modern web browser. High-performance VT100/ANSI rendering, resize sync, and 256-color palette powered by xterm.js.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. Architecture Section
          Accurate Representation: Encrypted WebSocket Relay Architecture
          (Zero-knowledge forwarder; WebRTC direct P2P is planned future).
          ==================================================================== */}
      <section
        id="architecture"
        className="border-b border-[var(--border-default)] px-4 sm:px-6 py-14 md:py-20 max-w-6xl mx-auto w-full space-y-10"
      >
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-secondary)]">
            <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>CRYPTOGRAPHIC PIPELINE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Zero-Knowledge Architecture
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            The signaling relay operates strictly as a blinded forwarder. Raw terminal byte streams and keystrokes are symmetrically encrypted with keys derived exclusively on endpoints.
          </p>
        </div>

        {/* 3-Stage Pipeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 sm:p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent)]">
              <Laptop className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Stage 1 &bull; Local Endpoint
              </span>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Native Host PTY</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Spawns PowerShell, CMD, or Bash using native Windows ConPTY API or Linux POSIX openpty. Encrypts all terminal frames with ChaCha20-Poly1305 before transmission.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 sm:p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent)]">
              <Radio className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Stage 2 &bull; Cloud Relay
              </span>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Blinded Relay Server</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Stateless high-concurrency Rust Axum service on Render. Relays encrypted Base64 frames via in-memory DashMap. Operates on a zero-knowledge basis with no decryption keys.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 sm:p-6 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent)]">
              <TerminalIcon className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                Stage 3 &bull; Browser Guest
              </span>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">xterm.js Web Client</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Decrypts frames in the browser using the endpoint-derived symmetric key. Renders native ANSI/VT100 sequences with GPU-accelerated canvas on shellvyn.reck98.in.
            </p>
          </div>
        </div>

        {/* Architecture Flow Schematic & Archify Documentation Callout */}
        <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
                Dataflow & Cryptographic Boundary
              </span>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                End-to-End Encrypted Relay Topology
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-canvas)] px-2.5 py-1 rounded border border-[var(--border-default)] self-start sm:self-auto">
              Zero Plaintext Exposure
            </span>
          </div>

          {/* 3 Nodes Schematic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-default)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-primary)]">Host Endpoint</span>
                <span className="text-[10px] text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">
                  Native PTY
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-sans leading-normal">
                Local Windows ConPTY or Linux POSIX. ChaCha20-Poly1305 symmetric cipher encrypts keystrokes and raw PTY screen updates.
              </p>
              <div className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                Key never leaves endpoints
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-default)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-primary)]">Signaling Relay</span>
                <span className="text-[10px] text-[var(--gold)] bg-[var(--gold)]/10 px-1.5 py-0.5 rounded">
                  Blinded Axum
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-sans leading-normal">
                Stateless WebSocket relay on Render. Forwards ciphertext frames via memory channels. Has zero access to decryption keys.
              </p>
              <div className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                WebRTC direct P2P planned
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-default)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-primary)]">Browser Guest</span>
                <span className="text-[10px] text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded">
                  xterm.js
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] font-sans leading-normal">
                Web Crypto API decrypts frames locally using the session key. Canvas renders VT100/ANSI sequences with sub-15ms latency.
              </p>
              <div className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                Zero guest installation
              </div>
            </div>
          </div>

          {/* Prominent Link to https://shellvyn.reck98.in/architecture */}
          <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--bg-canvas)]/60 p-4 sm:p-5 rounded-lg border border-[var(--border-default)]">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  Explore Full System Architecture
                </h4>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl">
                Interactive architecture specifications detailing the cryptographic handshake, Crockford Base32 session exchange, Axum relay routing, and future WebRTC direct data channels.
              </p>
            </div>
            <a
              href="/architecture"
              onClick={(e) => {
                if (onOpenArchitecture && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  e.preventDefault();
                  onOpenArchitecture();
                }
              }}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Explore Shellvyn architecture diagrams collection"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-mono font-medium text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 group"
            >
              <span>Explore Gallery (14 Diagrams)</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. CLI Reference Section
          Authentic command-line flags and syntax matching repository implementation.
          ==================================================================== */}
      <section
        id="cli"
        className="border-b border-[var(--border-default)] px-4 sm:px-6 py-14 md:py-20 max-w-6xl mx-auto w-full space-y-8"
      >
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-secondary)]">
            <TerminalIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>COMMAND-LINE INTERFACE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            CLI Commands
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            A single self-contained binary written in Rust. No Python, Node.js, or external runtimes required.
          </p>
        </div>

        <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl overflow-hidden divide-y divide-[var(--border-subtle)] shadow-xs">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <code className="text-xs font-mono font-bold text-[var(--accent)]">shellvyn share</code>
              <p className="text-xs text-[var(--text-secondary)]">
                Start an encrypted terminal sharing session through the default signaling server.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCopySnippet('shellvyn share', 'cli1')}
              className="px-3 py-1.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
            >
              {copiedSnippet === 'cli1' ? (
                <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedSnippet === 'cli1' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <code className="text-xs font-mono font-bold text-[var(--accent)]">
                shellvyn share --read-only
              </code>
              <p className="text-xs text-[var(--text-secondary)]">
                Start in observation mode. Remote viewers cannot transmit keystrokes or resize the shell.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCopySnippet('shellvyn share --read-only', 'cli2')}
              className="px-3 py-1.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
            >
              {copiedSnippet === 'cli2' ? (
                <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedSnippet === 'cli2' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <code className="text-xs font-mono font-bold text-[var(--accent)]">
                shellvyn local --port 3000
              </code>
              <p className="text-xs text-[var(--text-secondary)]">
                Launch an embedded local HTTP/WebSocket loopback server for single-machine testing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCopySnippet('shellvyn local --port 3000', 'cli3')}
              className="px-3 py-1.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
            >
              {copiedSnippet === 'cli3' ? (
                <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedSnippet === 'cli3' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <code className="text-xs font-mono font-bold text-[var(--accent)]">
                shellvyn test-pty
              </code>
              <p className="text-xs text-[var(--text-secondary)]">
                Run automated diagnostics verifying ConPTY/POSIX terminal spawning and I/O loopback.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCopySnippet('shellvyn test-pty', 'cli4')}
              className="px-3 py-1.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
            >
              {copiedSnippet === 'cli4' ? (
                <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedSnippet === 'cli4' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ====================================================================
          7. Footer — Strict Specification (Phase 7)
          Structure:
          - Two centered, pill-shaped links side-by-side on desktop (stacked on narrow mobile):
            1. System Architecture -> https://shellvyn.reck98.in/architecture
            2. GitHub Repository -> https://github.com/reck98/Shellvyn
          - Attribution centered below the pills:
            "Made with ❤️ by reck98" (reck98 -> https://github.com/reck98)
          - Subtle secondary metadata below attribution
          ==================================================================== */}
      <footer className="mt-auto border-t border-[var(--border-default)] bg-[var(--bg-subtle)]/40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 flex flex-col items-center justify-center space-y-6">
          {/* Two centered, pill-shaped links */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 w-full sm:w-auto">
            {/* 1. System Architecture Pill */}
            <a
              href="/architecture"
              onClick={(e) => {
                if (onOpenArchitecture && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  e.preventDefault();
                  onOpenArchitecture();
                }
              }}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Shellvyn System Architecture documentation"
              className="inline-flex items-center justify-center space-x-2.5 px-5 py-2.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-mono font-medium text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-all cursor-pointer shadow-xs active:scale-[0.98] group"
            >
              <Layers className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>System Architecture</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
            </a>

            {/* 2. GitHub Repository Pill */}
            <a
              href="https://github.com/reck98/Shellvyn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Shellvyn GitHub repository"
              className="inline-flex items-center justify-center space-x-2.5 px-5 py-2.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-mono font-medium text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-all cursor-pointer shadow-xs active:scale-[0.98] group"
            >
              <GithubIcon className="w-4 h-4 shrink-0" />
              <span>GitHub Repository</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
            </a>
          </div>

          {/* Centered Attribution */}
          <div className="flex flex-col items-center justify-center space-y-2 text-center">
            <p className="text-xs font-mono text-[var(--text-secondary)]">
              Made with ❤️ by{' '}
              <a
                href="https://github.com/reck98"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-primary)] font-semibold hover:text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] rounded transition-colors"
              >
                reck98
              </a>
            </p>
            <p className="text-[11px] font-mono text-[var(--text-muted)]">
              Shellvyn &bull; Dual-licensed under MIT and Apache-2.0
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
