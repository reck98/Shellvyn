import React from 'react';
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
  ExternalLink,
  Cpu,
  Lock,
  Zap,
  Activity,
  Layers,
  CheckCircle2,
} from 'lucide-react';

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
}

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
}) => {
  return (
    <div className="min-h-full flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-30 h-14 bg-[var(--bg-canvas)]/90 backdrop-blur-md border-b border-[var(--border-default)] px-6 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="6" fill="var(--accent)" />
            <path d="M7 11L13 16L7 21" stroke="var(--bg-canvas)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="21" cy="16" r="3.5" fill="var(--gold)" />
            <path d="M15 16H17.5" stroke="var(--bg-canvas)" strokeWidth="2" strokeLinecap="round" />
            <path d="M21 21.5V23" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M21 9V10.5" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-bold tracking-wider text-[var(--text-primary)]">
              SHELLVYN
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-muted)]">
              v0.1.0
            </span>
          </div>
        </div>

        {/* Desktop Anchor Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-mono text-[var(--text-secondary)]">
          <a href="#hero" className="hover:text-[var(--text-primary)] transition">Overview</a>
          <a href="#architecture" className="hover:text-[var(--text-primary)] transition">Architecture</a>
          <a href="#features" className="hover:text-[var(--text-primary)] transition">Features</a>
          <a href="#cli" className="hover:text-[var(--text-primary)] transition">CLI Reference</a>
        </nav>

        {/* Header Actions */}
        <div className="flex items-center space-x-2.5">
          <a
            href="https://github.com/reck98/Shellvyn"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1 text-xs font-mono rounded border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
          </a>

          <button
            type="button"
            onClick={onToggleTheme}
            className="w-8 h-8 rounded border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="hero" className="border-b border-[var(--border-default)] px-6 py-12 md:py-18 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Value Proposition & Interactive Console */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-secondary)]">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Zero-Knowledge E2EE Terminal Streaming</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                Secure terminal sharing for developers.
              </h1>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Stream your local Windows ConPTY or Linux PTY session directly to any browser with zero port-forwarding, zero cloud accounts, and zero software needed for guests.
              </p>
            </div>

            {/* Interactive Console Card */}
            <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 shadow-sm space-y-4">
              {/* Segmented Mode Switcher */}
              <div className="flex bg-[var(--bg-canvas)] p-1 rounded border border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setActiveConsoleTab('join')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    activeConsoleTab === 'join'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Join Session</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveConsoleTab('host')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    activeConsoleTab === 'host'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <TerminalIcon className="w-3.5 h-3.5" />
                  <span>Host a Terminal</span>
                </button>
              </div>

              {/* Tab 1: Join Session */}
              {activeConsoleTab === 'join' ? (
                <>
                  <form onSubmit={onConnect} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2 font-mono">
                        Pairing Code
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={pairingCode}
                          onChange={(e) => setPairingCode(normalizePairingCode(e.target.value))}
                          placeholder="XXXX-XXXX"
                          maxLength={9}
                          autoFocus
                          className="w-full h-12 bg-[var(--bg-canvas)] border border-[var(--border-default)] focus:border-[var(--border-focus)] rounded text-center text-xl font-mono tracking-widest text-[var(--text-primary)] focus:outline-none transition placeholder:text-[var(--text-muted)] uppercase"
                        />
                        {pairingCode && (
                          <button
                            type="button"
                            onClick={() => setPairingCode('')}
                            className="absolute right-3 top-3.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!isValidPairingCode(pairingCode)}
                      className="w-full h-10 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-hover)] disabled:text-[var(--text-muted)] text-[var(--accent-contrast)] text-xs font-medium rounded transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>Connect to Host</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* Recent Sessions */}
                  {recentCodes.length > 0 && (
                    <div className="pt-3 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-2 font-mono">
                        <span>Recent Sessions</span>
                        <button
                          onClick={onClearRecentCodes}
                          className="hover:text-[var(--text-secondary)] transition cursor-pointer flex items-center space-x-1 text-[10px]"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Clear</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentCodes.map((code) => (
                          <button
                            key={code}
                            onClick={() => {
                              setPairingCode(code);
                              onConnect(undefined, code);
                            }}
                            className="px-2.5 py-1 rounded bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                          >
                            {code}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Local Loopback Alternative */}
                  <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={onConnectLocal}
                      className="w-full h-9 bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium rounded transition flex items-center justify-center space-x-2 cursor-pointer font-mono"
                    >
                      <Laptop className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <span>Connect to Local PTY (127.0.0.1:3000)</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Tab 2: Host a Terminal */
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] font-mono">
                        1. Install Host Agent
                      </span>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => setInstallOs('windows')}
                          className={`px-2 py-0.5 text-[10px] rounded font-mono transition cursor-pointer ${
                            installOs === 'windows'
                              ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-medium'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-canvas)] border border-[var(--border-default)]'
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
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-canvas)] border border-[var(--border-default)]'
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
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-canvas)] border border-[var(--border-default)]'
                          }`}
                        >
                          Cargo
                        </button>
                      </div>
                    </div>

                    {/* Snippet Card */}
                    <div className="relative bg-[var(--bg-canvas)] border border-[var(--border-default)] rounded p-2.5 flex items-center justify-between">
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
                        className="absolute right-2 top-2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer bg-[var(--bg-surface)] border border-[var(--border-default)] rounded"
                        title="Copy command"
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
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2 font-mono">
                      2. Share Your Shell
                    </span>
                    <div className="relative bg-[var(--bg-canvas)] border border-[var(--border-default)] rounded p-2.5 flex items-center justify-between">
                      <code className="font-mono text-xs text-[var(--accent)] font-semibold">
                        shellvyn share
                      </code>
                      <button
                        type="button"
                        onClick={() => onCopySnippet('shellvyn share', 'share')}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer bg-[var(--bg-surface)] border border-[var(--border-default)] rounded"
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
                      Generates a secure pairing code to share with remote collaborators.
                    </p>
                  </div>

                  {/* Direct Downloads */}
                  <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] font-mono">
                      Manual Standalone Binaries
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href="https://github.com/reck98/Shellvyn/releases/latest/download/shellvyn-windows-x86_64.zip"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono transition"
                      >
                        <Download className="w-3 h-3 text-[var(--accent)]" />
                        <span>Windows (.exe)</span>
                      </a>
                      <a
                        href="https://github.com/reck98/Shellvyn/releases/latest/download/shellvyn-linux-x86_64.tar.gz"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono transition"
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

          {/* Right Column: Live Terminal Session Preview */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--success)] pulse-active"></span>
                <span>Active Terminal Stream</span>
              </span>
              <span>ConPTY (80x24)</span>
            </div>

            {/* App Frame Terminal Mock */}
            <div className="app-frame rounded-lg overflow-hidden border border-[var(--border-default)] shadow-lg">
              {/* Window Titlebar */}
              <div className="h-8 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] px-3 flex items-center justify-between select-none">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                </div>
                <div className="text-[11px] font-mono text-[var(--text-secondary)]">
                  shellvyn-host &bull; ~/projects/api
                </div>
                <div className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-default)]">
                  E2EE
                </div>
              </div>

              {/* Terminal View Content */}
              <div className="p-4 text-xs font-mono leading-relaxed space-y-2 text-[var(--term-fg)] overflow-x-auto min-h-[320px]">
                <div>
                  <span className="text-[var(--gold)]">$</span> shellvyn share
                </div>
                <div className="text-[var(--text-muted)]">
                  [Shellvyn] Initialized ConPTY process: powershell.exe (PID 14280)
                </div>
                <div className="text-[var(--text-muted)]">
                  [Shellvyn] Derived 256-bit ChaCha20-Poly1305 session key
                </div>

                <div className="text-[var(--text-secondary)] py-1 border-y border-[var(--border-subtle)] my-2">
                  <div className="text-[var(--accent)] font-bold">╔══════════════════════════════════════════════════════════╗</div>
                  <div>║  PAIRING CODE : <span className="text-[var(--gold)] font-bold">K7M2-9XPQ</span>                                ║</div>
                  <div>║  BROWSER LINK : https://shellvyn.reck98.in/#K7M2-9XPQ   ║</div>
                  <div className="text-[var(--accent)] font-bold">╚══════════════════════════════════════════════════════════╝</div>
                </div>

                <div className="text-[var(--text-muted)]">
                  [Shellvyn] Incoming connection from 198.51.100.42 (Chrome/macOS)
                </div>
                <div>
                  <span className="text-[var(--gold)]">[Shellvyn] Approve connection? [y/N]:</span> <span className="text-[var(--accent)] font-bold">y</span>
                </div>
                <div className="text-[var(--success)]">
                  [Shellvyn] Connection approved. Live interactive terminal streaming.
                </div>

                <div className="pt-2 text-[var(--term-fg)]">
                  <span className="text-[var(--accent)]">guest@devbox</span>:<span className="text-[var(--gold)]">~/projects/api</span>$ cargo test --quiet
                </div>
                <div className="text-[var(--text-secondary)]">
                  running 25 tests ... 25 passed; 0 failed; finished in 0.42s
                </div>
                <div className="text-[var(--term-fg)] flex items-center space-x-1">
                  <span><span className="text-[var(--accent)]">guest@devbox</span>:<span className="text-[var(--gold)]">~/projects/api</span>$</span>
                  <span className="terminal-cursor"></span>
                </div>
              </div>

              {/* Statusbar */}
              <div className="h-6 bg-[var(--bg-subtle)] border-t border-[var(--border-default)] px-3 flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--success)]"></span>
                  <span>Relay Channel Active</span>
                </div>
                <div>ChaCha20-Poly1305 &bull; 14ms latency</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Architecture & Security Section */}
      <section id="architecture" className="border-b border-[var(--border-default)] px-6 py-16 max-w-6xl mx-auto w-full space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-secondary)]">
            <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Cryptographic Pipeline</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Zero-Knowledge Architecture
          </h2>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
            The signaling relay acts purely as a blinded forwarder. Raw terminal byte streams and keystrokes are encrypted with symmetric keys derived exclusively on endpoints.
          </p>
        </div>

        {/* 3-Stage Pipeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 space-y-3">
            <div className="w-8 h-8 rounded bg-[var(--bg-canvas)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent)]">
              <Laptop className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Stage 1</span>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Native Host PTY</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Spawns PowerShell, CMD, or Bash using native Windows ConPTY API or Linux POSIX openpty. Encrypts all terminal frames with ChaCha20-Poly1305 before transmission.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 space-y-3">
            <div className="w-8 h-8 rounded bg-[var(--bg-canvas)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent)]">
              <Radio className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Stage 2</span>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Blinded Relay Server</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Stateless high-concurrency Rust Axum service. Relays encrypted Base64 frames between endpoints via in-memory DashMap. Possesses no ability to inspect terminal contents.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 space-y-3">
            <div className="w-8 h-8 rounded bg-[var(--bg-canvas)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent)]">
              <TerminalIcon className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Stage 3</span>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Browser Guest (xterm.js)</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Decrypts frames in the browser using the derived symmetric key. Renders native VT100/ANSI sequences with full 256-color support and GPU-accelerated canvas.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Features & Engineering Differentiators */}
      <section id="features" className="border-b border-[var(--border-default)] px-6 py-16 max-w-6xl mx-auto w-full space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-secondary)]">
            <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Developer-First Infrastructure</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Engineered for Precision & Speed
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 space-y-2.5">
            <div className="flex items-center space-x-2 text-[var(--text-primary)] font-semibold text-sm">
              <Cpu className="w-4 h-4 text-[var(--accent)]" />
              <span>True OS ConPTY Integration</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Not a synthetic browser terminal emulator. Directly launches PowerShell, Command Prompt, or Bash with genuine operating system process encapsulation.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 space-y-2.5">
            <div className="flex items-center space-x-2 text-[var(--text-primary)] font-semibold text-sm">
              <Lock className="w-4 h-4 text-[var(--accent)]" />
              <span>Host Authorization Prompts</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Hosts receive explicit [y/N] interactive terminal prompts showing remote IP and client agent before granting terminal access, preventing rogue attachments.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 space-y-2.5">
            <div className="flex items-center space-x-2 text-[var(--text-primary)] font-semibold text-sm">
              <Activity className="w-4 h-4 text-[var(--accent)]" />
              <span>Zero Firewall Configuration</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Outbound WebSocket connections traverse strict NATs, VPNs, and corporate firewalls without configuring port-forwarding or public IP addresses.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 space-y-2.5">
            <div className="flex items-center space-x-2 text-[var(--text-primary)] font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              <span>Read-Only Sharing Mode</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Start sessions with <code className="px-1 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-default)] font-mono text-[11px]">--read-only</code> to allow guests to watch real-time output while restricting keystroke transmission.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 space-y-2.5">
            <div className="flex items-center space-x-2 text-[var(--text-primary)] font-semibold text-sm">
              <KeyRound className="w-4 h-4 text-[var(--accent)]" />
              <span>Rate-Limited Brute Force Guard</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              The signaling relay enforces a 15-minute IP lockout after 5 invalid pairing attempts, securing the 40-bit Crockford Base32 pairing code entropy space.
            </p>
          </div>

          <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 space-y-2.5">
            <div className="flex items-center space-x-2 text-[var(--text-primary)] font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <span>Standalone Portable Binary</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Compiled in Rust as a compact standalone executable with zero runtime dependencies. Drop it on any machine and execute immediately.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CLI Command Reference */}
      <section id="cli" className="border-b border-[var(--border-default)] px-6 py-16 max-w-6xl mx-auto w-full space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-secondary)]">
            <TerminalIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Developer Reference</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            CLI Commands
          </h2>
        </div>

        <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg overflow-hidden divide-y divide-[var(--border-subtle)]">
          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <code className="text-xs font-mono font-bold text-[var(--accent)]">shellvyn share</code>
              <p className="text-xs text-[var(--text-secondary)]">Start an encrypted terminal sharing session through the default signaling server.</p>
            </div>
            <button
              type="button"
              onClick={() => onCopySnippet('shellvyn share', 'cmd1')}
              className="px-2.5 py-1 rounded bg-[var(--bg-canvas)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center space-x-1.5 self-start md:self-auto cursor-pointer"
            >
              {copiedSnippet === 'cmd1' ? <Check className="w-3 h-3 text-[var(--accent)]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSnippet === 'cmd1' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <code className="text-xs font-mono font-bold text-[var(--accent)]">shellvyn share --read-only</code>
              <p className="text-xs text-[var(--text-secondary)]">Start in observation mode. Remote viewers cannot transmit keystrokes or resize the shell.</p>
            </div>
            <button
              type="button"
              onClick={() => onCopySnippet('shellvyn share --read-only', 'cmd2')}
              className="px-2.5 py-1 rounded bg-[var(--bg-canvas)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center space-x-1.5 self-start md:self-auto cursor-pointer"
            >
              {copiedSnippet === 'cmd2' ? <Check className="w-3 h-3 text-[var(--accent)]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSnippet === 'cmd2' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <code className="text-xs font-mono font-bold text-[var(--accent)]">shellvyn local --port 3000</code>
              <p className="text-xs text-[var(--text-secondary)]">Launch an embedded local HTTP/WebSocket loopback server for single-machine testing.</p>
            </div>
            <button
              type="button"
              onClick={() => onCopySnippet('shellvyn local --port 3000', 'cmd3')}
              className="px-2.5 py-1 rounded bg-[var(--bg-canvas)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center space-x-1.5 self-start md:self-auto cursor-pointer"
            >
              {copiedSnippet === 'cmd3' ? <Check className="w-3 h-3 text-[var(--accent)]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSnippet === 'cmd3' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <code className="text-xs font-mono font-bold text-[var(--accent)]">shellvyn test-pty</code>
              <p className="text-xs text-[var(--text-secondary)]">Run automated diagnostics verifying ConPTY/POSIX terminal spawning and I/O loopback.</p>
            </div>
            <button
              type="button"
              onClick={() => onCopySnippet('shellvyn test-pty', 'cmd4')}
              className="px-2.5 py-1 rounded bg-[var(--bg-canvas)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition flex items-center space-x-1.5 self-start md:self-auto cursor-pointer"
            >
              {copiedSnippet === 'cmd4' ? <Check className="w-3 h-3 text-[var(--accent)]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSnippet === 'cmd4' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="px-6 py-10 max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[var(--text-muted)] gap-4">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-[var(--text-secondary)]">SHELLVYN</span>
          <span>&bull;</span>
          <span>Dual-licensed under MIT and Apache-2.0</span>
        </div>
        <div className="flex items-center space-x-4">
          <a
            href="https://github.com/reck98/Shellvyn"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--text-primary)] transition flex items-center space-x-1"
          >
            <span>GitHub Repository</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>&bull;</span>
          <a
            href="https://github.com/reck98/Shellvyn/releases"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--text-primary)] transition"
          >
            Releases
          </a>
        </div>
      </footer>
    </div>
  );
};
