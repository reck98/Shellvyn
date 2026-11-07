import React, { useState, useMemo } from 'react';
import {
  Sun,
  Moon,
  ArrowLeft,
  Search,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  Cpu,
  Terminal,
  Cloud,
  ArrowUpRight,
} from 'lucide-react';
import { ShellvynLogo } from './ShellvynLogo';

export interface ArchitectureDiagramMeta {
  slug: string;
  title: string;
  category: string;
  type: string;
  description: string;
  tags: string[];
  htmlUrl: string;
  pngUrl: string;
  previewUrl: string;
  darkPngUrl: string;
  lightPngUrl: string;
}

interface ArchitectureGalleryProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onBackToApp: () => void;
  manifest?: ArchitectureDiagramMeta[];
}

// Fallback embedded manifest ensuring zero runtime failure if fetch is delayed
const DEFAULT_MANIFEST: ArchitectureDiagramMeta[] = [
  {
    slug: 'system-architecture',
    title: 'Complete System Architecture',
    category: 'System Overview',
    type: 'architecture',
    description: 'End-to-end zero-knowledge architecture spanning native Host PTY, Rust CLI agent, Axum stateless signaling relay on Render, and React 19 xterm.js browser client with ChaCha20-Poly1305 encryption.',
    tags: ['Rust', 'ConPTY', 'POSIX', 'Axum', 'ChaCha20-Poly1305', 'xterm.js', 'Render'],
    htmlUrl: '/architecture/diagrams/system-architecture.html',
    pngUrl: '/architecture/diagrams/system-architecture.png',
    previewUrl: '/architecture/diagrams/system-architecture.png',
    darkPngUrl: '/architecture/diagrams/system-architecture.dark.png',
    lightPngUrl: '/architecture/diagrams/system-architecture.light.png'
  },
  {
    slug: 'end-to-end-topology',
    title: 'End-to-End Application & Network Topology',
    category: 'System Overview',
    type: 'architecture',
    description: 'Multi-tier network boundaries, TLS/WSS transport layer, in-memory DashMap connection routing, and local loopback developer mode.',
    tags: ['WebSocket', 'TLS', 'DashMap', 'Loopback', 'Tokio'],
    htmlUrl: '/architecture/diagrams/end-to-end-topology.html',
    pngUrl: '/architecture/diagrams/end-to-end-topology.png',
    previewUrl: '/architecture/diagrams/end-to-end-topology.png',
    darkPngUrl: '/architecture/diagrams/end-to-end-topology.dark.png',
    lightPngUrl: '/architecture/diagrams/end-to-end-topology.light.png'
  },
  {
    slug: 'frontend-architecture',
    title: 'React Frontend Architecture & Component Hierarchy',
    category: 'Frontend Architecture',
    type: 'architecture',
    description: 'Component structure of the web client showing App root, connection state machine, LandingPage, Console Tab Router, TerminalView, noble-hashes, and WebGL-accelerated canvas.',
    tags: ['React 19', 'TypeScript', 'xterm.js', 'WebGL', 'Tailwind CSS'],
    htmlUrl: '/architecture/diagrams/frontend-architecture.html',
    pngUrl: '/architecture/diagrams/frontend-architecture.png',
    previewUrl: '/architecture/diagrams/frontend-architecture.png',
    darkPngUrl: '/architecture/diagrams/frontend-architecture.dark.png',
    lightPngUrl: '/architecture/diagrams/frontend-architecture.light.png'
  },
  {
    slug: 'terminal-pipeline',
    title: 'Terminal UI & xterm.js Rendering Pipeline',
    category: 'Frontend Architecture',
    type: 'dataflow',
    description: 'High-throughput dataflow from encrypted WebSocket frame intake to Base64 decode, ChaCha20-Poly1305 decryption, binary demux, ANSI/VT100 parsing, and 60 FPS Canvas render.',
    tags: ['xterm.js', 'Web Crypto', 'Demux', 'ANSI/VT100', 'WebGL'],
    htmlUrl: '/architecture/diagrams/terminal-pipeline.html',
    pngUrl: '/architecture/diagrams/terminal-pipeline.png',
    previewUrl: '/architecture/diagrams/terminal-pipeline.png',
    darkPngUrl: '/architecture/diagrams/terminal-pipeline.dark.png',
    lightPngUrl: '/architecture/diagrams/terminal-pipeline.light.png'
  },
  {
    slug: 'signaling-server',
    title: 'Rust Axum Signaling Server & Session Registry',
    category: 'Backend Architecture',
    type: 'architecture',
    description: 'Stateless Axum signaling relay architecture featuring WebSocket upgrade handler, DashMap lock-free thread-safe routing, and bounded Tokio mpsc channels.',
    tags: ['Rust', 'Axum', 'Tokio', 'DashMap', 'WebSocket'],
    htmlUrl: '/architecture/diagrams/signaling-server.html',
    pngUrl: '/architecture/diagrams/signaling-server.png',
    previewUrl: '/architecture/diagrams/signaling-server.png',
    darkPngUrl: '/architecture/diagrams/signaling-server.dark.png',
    lightPngUrl: '/architecture/diagrams/signaling-server.light.png'
  },
  {
    slug: 'protocol-framing',
    title: 'WebSocket Protocol & Binary Framing Architecture',
    category: 'Backend Architecture',
    type: 'dataflow',
    description: 'Wire specification mapping JSON signaling control frames (0x00 Init, 0x01 Approval) and multiplexed binary stream frames (0x01 Data, 0x02 Resize, 0x03 Close).',
    tags: ['Binary Wire', 'Framing Spec', 'Demux', 'ResizeSync'],
    htmlUrl: '/architecture/diagrams/protocol-framing.html',
    pngUrl: '/architecture/diagrams/protocol-framing.png',
    previewUrl: '/architecture/diagrams/protocol-framing.png',
    darkPngUrl: '/architecture/diagrams/protocol-framing.dark.png',
    lightPngUrl: '/architecture/diagrams/protocol-framing.light.png'
  },
  {
    slug: 'host-session-workflow',
    title: 'Host Session Creation & Pairing Workflow',
    category: 'Host & Viewer Workflows',
    type: 'workflow',
    description: 'Host initialization path: parsing CLI flags, allocating PTY child process, connecting to relay over TLS, generating Crockford Base32 pairing code, and waiting for guest join.',
    tags: ['CLI Workflow', 'Base32', 'ConPTY Spawning', 'Session Init'],
    htmlUrl: '/architecture/diagrams/host-session-workflow.html',
    pngUrl: '/architecture/diagrams/host-session-workflow.png',
    previewUrl: '/architecture/diagrams/host-session-workflow.png',
    darkPngUrl: '/architecture/diagrams/host-session-workflow.dark.png',
    lightPngUrl: '/architecture/diagrams/host-session-workflow.light.png'
  },
  {
    slug: 'viewer-join-sequence',
    title: 'Viewer Join & Host Authorization Sequence',
    category: 'Host & Viewer Workflows',
    type: 'sequence',
    description: 'Multi-party handshaking sequence across Guest Browser, Axum Relay, and Host CLI enforcing mandatory two-way host interactive approval ([y/N]) before streaming starts.',
    tags: ['Consent Gate', 'Interactive Approval', 'Two-Way Handshake'],
    htmlUrl: '/architecture/diagrams/viewer-join-sequence.html',
    pngUrl: '/architecture/diagrams/viewer-join-sequence.png',
    previewUrl: '/architecture/diagrams/viewer-join-sequence.png',
    darkPngUrl: '/architecture/diagrams/viewer-join-sequence.dark.png',
    lightPngUrl: '/architecture/diagrams/viewer-join-sequence.light.png'
  },
  {
    slug: 'pty-lifecycle',
    title: 'Native ConPTY & POSIX Terminal Lifecycle',
    category: 'Terminal Architecture',
    type: 'lifecycle',
    description: 'Terminal process state transitions from initialization, ConPTY/openpty allocation, active I/O loop, terminal resize events (SIGWINCH), to process termination and cleanup.',
    tags: ['ConPTY', 'POSIX openpty', 'SIGWINCH', 'Process Lifecycle', 'Win32 API'],
    htmlUrl: '/architecture/diagrams/pty-lifecycle.html',
    pngUrl: '/architecture/diagrams/pty-lifecycle.png',
    previewUrl: '/architecture/diagrams/pty-lifecycle.png',
    darkPngUrl: '/architecture/diagrams/pty-lifecycle.dark.png',
    lightPngUrl: '/architecture/diagrams/pty-lifecycle.light.png'
  },
  {
    slug: 'security-key-derivation',
    title: 'ChaCha20-Poly1305 Cryptographic Key Derivation Flow',
    category: 'Security Architecture',
    type: 'dataflow',
    description: 'Cryptographic pipeline deriving 256-bit symmetric keys from Crockford Base32 pairing code and relay session salt using HKDF-SHA256, with per-frame nonce management.',
    tags: ['HKDF-SHA256', 'ChaCha20-Poly1305', 'E2EE', 'Zero-Knowledge', 'Web Crypto'],
    htmlUrl: '/architecture/diagrams/security-key-derivation.html',
    pngUrl: '/architecture/diagrams/security-key-derivation.png',
    previewUrl: '/architecture/diagrams/security-key-derivation.png',
    darkPngUrl: '/architecture/diagrams/security-key-derivation.dark.png',
    lightPngUrl: '/architecture/diagrams/security-key-derivation.light.png'
  },
  {
    slug: 'zero-knowledge-security-model',
    title: 'Zero-Knowledge Trust Boundaries & Security Model',
    category: 'Security Architecture',
    type: 'architecture',
    description: 'Isolation of security domains: Host Local Zone (plaintext PTY access), Blinded Relay Zone (untrusted cloud relay with zero key access), and Browser Guest Sandbox.',
    tags: ['Security Domains', 'Trust Boundaries', 'Blinded Relay', 'Zero-Trust'],
    htmlUrl: '/architecture/diagrams/zero-knowledge-security-model.html',
    pngUrl: '/architecture/diagrams/zero-knowledge-security-model.png',
    previewUrl: '/architecture/diagrams/zero-knowledge-security-model.png',
    darkPngUrl: '/architecture/diagrams/zero-knowledge-security-model.dark.png',
    lightPngUrl: '/architecture/diagrams/zero-knowledge-security-model.light.png'
  },
  {
    slug: 'deployment-infrastructure',
    title: 'Cloud Relay & Multi-Platform Deployment Architecture',
    category: 'Infrastructure & Deployment',
    type: 'architecture',
    description: 'Production deployment topology showing Dockerized Axum container on Render, Cloudflare edge CDN, static assets at shellvyn.reck98.in, and GitHub Release binary distribution.',
    tags: ['Render', 'Docker', 'Cloudflare', 'GitHub Releases', 'Cross-Compilation'],
    htmlUrl: '/architecture/diagrams/deployment-infrastructure.html',
    pngUrl: '/architecture/diagrams/deployment-infrastructure.png',
    previewUrl: '/architecture/diagrams/deployment-infrastructure.png',
    darkPngUrl: '/architecture/diagrams/deployment-infrastructure.dark.png',
    lightPngUrl: '/architecture/diagrams/deployment-infrastructure.light.png'
  },
  {
    slug: 'terminal-streaming-sequence',
    title: 'Bi-Directional Terminal Streaming Sequence',
    category: 'Sequence & Data Flow',
    type: 'sequence',
    description: 'Real-time communication sequence showing PTY stdout capture, client-side encryption, WebSocket relay forwarding, and browser keystroke dispatch back to host stdin.',
    tags: ['Bi-Directional', 'Sub-15ms Latency', 'Keystrokes', 'PTY Diffing'],
    htmlUrl: '/architecture/diagrams/terminal-streaming-sequence.html',
    pngUrl: '/architecture/diagrams/terminal-streaming-sequence.png',
    previewUrl: '/architecture/diagrams/terminal-streaming-sequence.png',
    darkPngUrl: '/architecture/diagrams/terminal-streaming-sequence.dark.png',
    lightPngUrl: '/architecture/diagrams/terminal-streaming-sequence.light.png'
  },
  {
    slug: 'session-cleanup-sequence',
    title: 'Session Disconnect & Resource Cleanup Sequence',
    category: 'Sequence & Data Flow',
    type: 'sequence',
    description: 'Orderly teardown sequence when a session is closed: close frame broadcast, DashMap session deregistration, terminal process termination, and browser socket closure.',
    tags: ['Teardown', 'Resource Cleanup', 'Graceful Shutdown', 'DashMap Eviction'],
    htmlUrl: '/architecture/diagrams/session-cleanup-sequence.html',
    pngUrl: '/architecture/diagrams/session-cleanup-sequence.png',
    previewUrl: '/architecture/diagrams/session-cleanup-sequence.png',
    darkPngUrl: '/architecture/diagrams/session-cleanup-sequence.dark.png',
    lightPngUrl: '/architecture/diagrams/session-cleanup-sequence.light.png'
  }
];

export const ArchitectureGallery: React.FC<ArchitectureGalleryProps> = ({
  theme,
  onToggleTheme,
  onBackToApp,
  manifest = DEFAULT_MANIFEST,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique categories
  const categories = useMemo(() => {
    const list = Array.from(new Set(manifest.map((d) => d.category)));
    return ['All', ...list];
  }, [manifest]);

  // Filtered diagrams
  const filteredDiagrams = useMemo(() => {
    return manifest.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [manifest, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--term-selection)]">
      {/* 1. Gallery Header */}
      <header className="sticky top-0 z-40 h-14 bg-[var(--bg-canvas)]/92 backdrop-blur-md border-b border-[var(--border-default)] transition-colors">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToApp}
              className="inline-flex items-center space-x-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Return to Terminal</span>
              <span className="sm:hidden">Back</span>
            </button>
            <div className="h-4 w-px bg-[var(--border-default)]" />
            <div className="flex items-center space-x-2">
              <ShellvynLogo symbolSize="w-5 h-5" />
              <span className="text-xs font-mono font-medium text-[var(--text-muted)] hidden md:inline">
                / architecture
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--accent)] hidden sm:inline">
              14 Interactive Diagrams
            </span>
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[var(--gold)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Dossier Banner */}
      <section className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]/60 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <span>TECHNICAL ARCHITECTURE DOSSIER</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
              Shellvyn Architecture &amp; System Flow
            </h1>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Complete collection of interactive architecture diagrams reverse-engineered from Shellvyn&apos;s source code.
              Every diagram is generated with the <strong className="text-[var(--text-primary)] font-medium">Archify skill</strong>,
              providing standalone zoomable HTML with light/dark theme synchronization, motion tracing, and high-resolution export sidecars.
            </p>

            {/* Architectural Highlights / Badges */}
            <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>ChaCha20-Poly1305 E2EE</span>
              </div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>ConPTY &amp; POSIX</span>
              </div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                <Cloud className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Rust Axum Relay on Render</span>
              </div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                <Cpu className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>WebGL xterm.js Canvas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Filter & Search Controls */}
      <section className="sticky top-14 z-30 bg-[var(--bg-canvas)]/95 backdrop-blur-md border-b border-[var(--border-default)] py-4 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs font-mono">
              {categories.map((cat) => {
                const count =
                  cat === 'All'
                    ? manifest.length
                    : manifest.filter((d) => d.category === cat).length;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] font-semibold shadow-xs'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-focus)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="ml-1.5 opacity-70 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Keyword Search Input */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search diagrams, components, tags..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-focus)] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Gallery Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 md:py-12">
        {filteredDiagrams.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
            <p className="text-sm font-mono text-[var(--text-muted)]">
              No architecture diagrams found matching &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-3 px-3 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-canvas)] text-xs font-mono text-[var(--accent)] hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDiagrams.map((d) => {
              const imageSrc = theme === 'dark' ? d.darkPngUrl : d.lightPngUrl;
              return (
                <article
                  key={d.slug}
                  className="group flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-focus)] hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Visual Preview Thumbnail Container */}
                  <div className="relative w-full aspect-16/10 bg-[var(--bg-canvas)] border-b border-[var(--border-default)] overflow-hidden">
                    <img
                      src={imageSrc}
                      alt={`${d.title} preview diagram`}
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                      onError={(e) => {
                        // Fallback to canonical .png if theme-specific PNG fails
                        const target = e.currentTarget;
                        if (target.src !== d.pngUrl) {
                          target.src = d.pngUrl;
                        }
                      }}
                    />
                    {/* Format / Type Badge */}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-[var(--border-default)] bg-[var(--bg-canvas)]/90 backdrop-blur-xs text-[var(--text-secondary)] uppercase tracking-wider">
                      {d.type}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-[11px] font-mono text-[var(--accent)] font-medium">
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>{d.category}</span>
                      </div>

                      <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight leading-snug group-hover:text-[var(--accent)] transition-colors">
                        {d.title}
                      </h3>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                        {d.description}
                      </p>
                    </div>

                    <div className="space-y-3.5 pt-2 border-t border-[var(--border-default)]/60">
                      {/* Component Tags */}
                      <div className="flex flex-wrap gap-1">
                        {d.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-default)] text-[var(--text-muted)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Action Links */}
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={d.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-mono font-medium transition cursor-pointer shadow-xs active:scale-[0.98]"
                        >
                          <span>Open Interactive</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <a
                          href={d.pngUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open canonical high-resolution PNG sidecar"
                          className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-hover)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer active:scale-[0.98]"
                        >
                          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>PNG</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. Footer */}
      <footer className="mt-auto border-t border-[var(--border-default)] bg-[var(--bg-subtle)]/40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 flex flex-col items-center justify-center space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 w-full sm:w-auto">
            <button
              onClick={onBackToApp}
              className="inline-flex items-center justify-center space-x-2.5 px-5 py-2.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-mono font-medium text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>Return to Shellvyn Terminal</span>
            </button>

            <a
              href="https://github.com/reck98/Shellvyn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Shellvyn GitHub repository"
              className="inline-flex items-center justify-center space-x-2.5 px-5 py-2.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-mono font-medium text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-all cursor-pointer shadow-xs active:scale-[0.98] group"
            >
              <ShellvynLogo symbolSize="w-4 h-4" />
              <span>GitHub Repository</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
            </a>
          </div>

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
              Shellvyn Technical Architecture &bull; Generated with Archify &bull; Dual-licensed under MIT and Apache-2.0
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
