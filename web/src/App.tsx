import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TerminalView } from './components/TerminalView';
import { Terminal } from '@xterm/xterm';
import {
  PermissionMode,
  decodeFrame,
  encodeData,
  encodeResize,
} from './protocol/framing';
import { normalizePairingCode, isValidPairingCode } from './protocol/pairing';
import {
  deriveSessionKey,
  encryptToBase64,
  decryptFromBase64,
} from './protocol/crypto';
import {
  Sun,
  Moon,
  Copy,
  Check,
  Terminal as TerminalIcon,
  WifiOff,
  Lock,
  Unlock,
  Radio,
  ArrowRight,
  LogOut,
  Laptop,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  Trash2,
} from 'lucide-react';

type ConnectionState = 'idle' | 'awaiting_approval' | 'connected' | 'disconnected';
type Theme = 'light' | 'dark';

export const App: React.FC = () => {
  // Theme management
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('shellvyn-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const [pairingCode, setPairingCode] = useState('');
  const [connState, setConnState] = useState<ConnectionState>('idle');
  const [permission, setPermission] = useState<PermissionMode>(PermissionMode.Interactive);
  const [connectionMode, setConnectionMode] = useState<'loopback' | 'relay'>('loopback');
  const [remoteHostname, setRemoteHostname] = useState<string>('Local Host');
  const [terminalDimensions, setTerminalDimensions] = useState({ cols: 80, rows: 24 });
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [recentCodes, setRecentCodes] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('shellvyn-recents') || '[]');
    } catch {
      return [];
    }
  });

  const socketRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const sessionKeyRef = useRef<Uint8Array | null>(null);
  const hostIdRef = useRef<string | null>(null);
  const clientIdRef = useRef<string>(`viewer-${Math.random().toString(36).substring(2, 9)}`);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('shellvyn-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const saveRecentCode = (code: string) => {
    setRecentCodes((prev) => {
      const filtered = prev.filter((c) => c !== code);
      const updated = [code, ...filtered].slice(0, 3);
      localStorage.setItem('shellvyn-recents', JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentCodes = () => {
    localStorage.removeItem('shellvyn-recents');
    setRecentCodes([]);
  };

  const connectWebSocket = useCallback((url: string, isRemote: boolean = false, codeForE2ee?: string) => {
    setConnState('awaiting_approval');
    setDisconnectReason(null);
    sessionKeyRef.current = null;
    hostIdRef.current = null;

    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    socketRef.current = ws;

    ws.onopen = () => {
      if (isRemote && codeForE2ee) {
        ws.send(JSON.stringify({
          type: 'join',
          code: codeForE2ee,
        }));
      } else {
        setConnState('connected');
      }
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(event.data);
        if (bytes.length === 0) return;

        try {
          const frame = decodeFrame(bytes);
          switch (frame.type) {
            case 'data':
              if (terminalRef.current) {
                terminalRef.current.write(frame.data);
              }
              break;
            case 'close':
              setDisconnectReason(frame.reason || 'Session terminated by host');
              setConnState('disconnected');
              break;
            case 'permission':
              setPermission(frame.mode);
              break;
          }
        } catch {
          // Loopback raw mode fallback
          if (terminalRef.current) {
            terminalRef.current.write(bytes);
          }
        }
      } else if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'join_result') {
            if (msg.status === 'connected') {
              if (msg.host_id) hostIdRef.current = msg.host_id;
              if (msg.hostname) setRemoteHostname(msg.hostname);
              if (msg.permission) {
                setPermission(msg.permission === 'read_only' ? PermissionMode.ReadOnly : PermissionMode.Interactive);
              }
              // Derive zero-knowledge key from code & session salt
              if (codeForE2ee && msg.session_salt) {
                const saltBytes = new TextEncoder().encode(msg.session_salt);
                sessionKeyRef.current = deriveSessionKey(codeForE2ee, saltBytes);
                saveRecentCode(codeForE2ee);
              }
              setConnectionMode('relay');
              setConnState('connected');
            } else {
              setDisconnectReason(msg.message || `Connection error: ${msg.status}`);
              setConnState('disconnected');
            }
          } else if (msg.type === 'relay_data') {
            if (sessionKeyRef.current && msg.payload) {
              try {
                const frameBytes = decryptFromBase64(sessionKeyRef.current, msg.payload);
                const frame = decodeFrame(frameBytes);
                if (frame.type === 'data' && terminalRef.current) {
                  terminalRef.current.write(frame.data);
                } else if (frame.type === 'close') {
                  setDisconnectReason(frame.reason || 'Host closed session');
                  setConnState('disconnected');
                } else if (frame.type === 'permission') {
                  setPermission(frame.mode);
                }
              } catch (e) {
                console.error('Failed to decrypt relay payload:', e);
              }
            }
          } else if (msg.type === 'error') {
            setDisconnectReason(msg.message);
            setConnState('disconnected');
          }
        } catch {
          if (terminalRef.current) {
            terminalRef.current.write(event.data);
          }
        }
      }
    };

    ws.onclose = () => {
      setConnState('disconnected');
    };

    ws.onerror = () => {
      setDisconnectReason('Unable to establish WebSocket connection with signaling server');
      setConnState('disconnected');
    };
  }, []);

  const handleConnectLocal = () => {
    const wsUrl = `ws://${window.location.hostname || '127.0.0.1'}:3000/ws`;
    setConnectionMode('loopback');
    setRemoteHostname('Local Host PTY');
    connectWebSocket(wsUrl, false);
  };

  const handleConnectCode = (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    const targetCode = customCode || pairingCode;
    if (!isValidPairingCode(targetCode)) return;

    const normalized = normalizePairingCode(targetCode);
    const signalingUrl = `ws://${window.location.hostname || '127.0.0.1'}:8080/ws`;
    connectWebSocket(signalingUrl, true, normalized);
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    sessionKeyRef.current = null;
    hostIdRef.current = null;
    setConnState('idle');
  };

  const handleTerminalInput = (input: string) => {
    if (permission === PermissionMode.ReadOnly) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const frame = encodeData(input);
      if (connectionMode === 'relay' && sessionKeyRef.current && hostIdRef.current) {
        const b64 = encryptToBase64(sessionKeyRef.current, frame);
        socketRef.current.send(JSON.stringify({
          type: 'relay_data',
          from_id: clientIdRef.current,
          target_id: hostIdRef.current,
          payload: b64,
        }));
      } else {
        socketRef.current.send(frame.buffer as ArrayBuffer);
      }
    }
  };

  const handleTerminalResize = (cols: number, rows: number) => {
    setTerminalDimensions({ cols, rows });
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const frame = encodeResize(cols, rows);
      if (connectionMode === 'relay' && sessionKeyRef.current && hostIdRef.current) {
        const b64 = encryptToBase64(sessionKeyRef.current, frame);
        socketRef.current.send(JSON.stringify({
          type: 'relay_data',
          from_id: clientIdRef.current,
          target_id: hostIdRef.current,
          payload: b64,
        }));
      } else {
        socketRef.current.send(frame.buffer as ArrayBuffer);
      }
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href.split('#')[0] + '#' + pairingCode;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleClearTerminal = () => {
    terminalRef.current?.clear();
  };

  // Keyboard shortcut listener (Esc to cancel connecting)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && connState === 'awaiting_approval') {
        handleDisconnect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connState]);

  return (
    <div className="flex flex-col w-screen h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-hidden font-sans select-none">
      {/* 1. Header Navigation Bar (Restrained, 44px) */}
      <header className="h-11 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-semibold tracking-tight flex items-center text-[var(--text-primary)]">
              <span className="text-[var(--accent)] mr-1">&gt;_</span>
              <span>Shellvyn</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)]">
              v0.1.0
            </span>
          </div>

          {connState === 'connected' && (
            <div className="hidden sm:flex items-center space-x-2 text-xs text-[var(--text-secondary)] pl-3 border-l border-[var(--border-default)]">
              <span className="font-mono">{remoteHostname}</span>
              <span className="text-[var(--text-muted)]">•</span>
              <span className="font-mono text-[var(--accent)]">{pairingCode || 'LOCAL'}</span>
            </div>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2">
          {connState === 'connected' && (
            <>
              {/* Connection Mode Indicator */}
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                <span className="capitalize">{connectionMode === 'relay' ? 'Zero-Knowledge Relay' : 'Local Loopback'}</span>
              </div>

              {/* Permission Badge */}
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                {permission === PermissionMode.Interactive ? (
                  <>
                    <Unlock className="w-3 h-3 text-[var(--accent)]" />
                    <span>Interactive</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-[var(--warning)]" />
                    <span>Read-Only</span>
                  </>
                )}
              </div>

              {/* Copy Link Action */}
              {pairingCode && (
                <button
                  onClick={handleCopyLink}
                  title="Copy session URL"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-default)] transition cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Clear Terminal */}
              <button
                onClick={handleClearTerminal}
                title="Clear terminal buffer"
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent hover:border-[var(--border-default)] transition cursor-pointer text-xs font-mono"
              >
                Clear
              </button>

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                className="flex items-center space-x-1 px-2.5 py-1 rounded border border-[var(--border-default)] hover:border-[var(--error)] text-[var(--text-secondary)] hover:text-[var(--error)] text-xs transition cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Disconnect</span>
              </button>
            </>
          )}

          {connState === 'idle' && (
            <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                <span>Signaling Ready</span>
              </span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle visual theme"
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] transition cursor-pointer ml-1"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* State: Idle / Connection Console */}
        {connState === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--bg-canvas)]">
            <div className="w-full max-w-md flex flex-col space-y-6">
              {/* Product Header */}
              <div className="space-y-1.5 text-center">
                <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                  Connect to Terminal
                </h2>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
                  Enter an 8-character pairing code to establish a zero-knowledge encrypted terminal session.
                </p>
              </div>

              {/* Connection Console Surface */}
              <div className="border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-5 shadow-sm space-y-5">
                <form onSubmit={handleConnectCode} className="space-y-4">
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
                          className="absolute right-3 top-3.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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

                {/* Recent Codes */}
                {recentCodes.length > 0 && (
                  <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-2 font-mono">
                      <span>Recent Sessions</span>
                      <button
                        onClick={clearRecentCodes}
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
                            handleConnectCode(undefined, code);
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
                    onClick={handleConnectLocal}
                    className="w-full h-9 bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium rounded transition flex items-center justify-center space-x-2 cursor-pointer font-mono"
                  >
                    <Laptop className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>Connect to Local PTY (127.0.0.1:3000)</span>
                  </button>
                </div>
              </div>

              {/* Technical Specifications (Minimal, High Density) */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-[11px] text-[var(--text-muted)]">
                <div className="space-y-1 border-t border-[var(--border-subtle)] pt-2.5">
                  <div className="flex items-center space-x-1 font-semibold text-[var(--text-secondary)]">
                    <ShieldCheck className="w-3 h-3 text-[var(--accent)]" />
                    <span>Zero-Knowledge</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    ChaCha20-Poly1305 with HKDF keys derived from pairing code.
                  </p>
                </div>

                <div className="space-y-1 border-t border-[var(--border-subtle)] pt-2.5">
                  <div className="flex items-center space-x-1 font-semibold text-[var(--text-secondary)]">
                    <TerminalIcon className="w-3 h-3 text-[var(--accent)]" />
                    <span>Native PTY</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    Direct Win32 ConPTY & POSIX openpty process encapsulation.
                  </p>
                </div>

                <div className="space-y-1 border-t border-[var(--border-subtle)] pt-2.5">
                  <div className="flex items-center space-x-1 font-semibold text-[var(--text-secondary)]">
                    <KeyRound className="w-3 h-3 text-[var(--accent)]" />
                    <span>Rate-Limited</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    40-bit entropy pairing code with 15-minute IP brute-force lockout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State: Awaiting Approval */}
        {connState === 'awaiting_approval' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--bg-canvas)]">
            <div className="w-full max-w-sm border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-6 text-center space-y-4 shadow-sm">
              <div className="w-9 h-9 rounded border border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center justify-center mx-auto text-[var(--accent)]">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Awaiting Host Approval</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Connection request transmitted for code <span className="font-mono font-semibold text-[var(--accent)]">{pairingCode}</span>.
                </p>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Press [Esc] or click below to cancel.
              </p>
              <button
                onClick={handleDisconnect}
                className="w-full h-8 border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-xs rounded transition cursor-pointer"
              >
                Cancel Connection
              </button>
            </div>
          </div>
        )}

        {/* State: Connected (Full Terminal View) */}
        {connState === 'connected' && (
          <div className="flex-1 w-full h-full relative overflow-hidden bg-[var(--term-bg)]">
            <TerminalView
              terminalRef={terminalRef}
              onInput={handleTerminalInput}
              onResize={handleTerminalResize}
              readOnly={permission === PermissionMode.ReadOnly}
              theme={theme}
            />
          </div>
        )}

        {/* State: Disconnected / Error */}
        {connState === 'disconnected' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--bg-canvas)]">
            <div className="w-full max-w-sm border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-lg p-6 text-center space-y-4 shadow-sm">
              <div className="w-9 h-9 rounded border border-[var(--border-default)] bg-[var(--error-bg)] flex items-center justify-center mx-auto text-[var(--error)]">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Session Disconnected</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {disconnectReason || 'The remote host or signaling relay terminated the connection.'}
                </p>
              </div>
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={handleDisconnect}
                  className="flex-1 h-9 border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-medium rounded transition cursor-pointer"
                >
                  Return to Lobby
                </button>
                {pairingCode && (
                  <button
                    onClick={() => handleConnectCode()}
                    className="flex-1 h-9 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)] text-xs font-medium rounded transition cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reconnect</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom Status Bar (Clean Monospace, 24px) */}
      <footer className="h-6 border-t border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono select-none">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className="text-[var(--text-secondary)]">E2EE:</span>
            <span>ChaCha20-Poly1305</span>
          </div>
          <span className="text-[var(--border-default)]">/</span>
          <div className="hidden sm:inline">
            <span className="text-[var(--text-secondary)]">Protocol:</span>
            <span> Wire v2</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div>
            <span className="text-[var(--text-secondary)]">Geometry:</span>
            <span> {terminalDimensions.cols}x{terminalDimensions.rows}</span>
          </div>
          <span className="text-[var(--border-default)]">/</span>
          <div className="flex items-center space-x-1">
            <span className={`w-1.5 h-1.5 rounded-full ${connState === 'connected' ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
            <span className="capitalize">{connState === 'connected' ? 'Online' : 'Standby'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
