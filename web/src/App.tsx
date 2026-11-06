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
  Shield,
  Terminal as TerminalIcon,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Radio,
  ArrowRight,
  LogOut,
  Layers,
} from 'lucide-react';

type ConnectionState = 'idle' | 'awaiting_approval' | 'connected' | 'disconnected';

export const App: React.FC = () => {
  const [pairingCode, setPairingCode] = useState('');
  const [connState, setConnState] = useState<ConnectionState>('idle');
  const [permission, setPermission] = useState<PermissionMode>(PermissionMode.Interactive);
  const [connectionMode, setConnectionMode] = useState<'loopback' | 'webrtc' | 'relay'>('loopback');
  const [remoteHostname, setRemoteHostname] = useState<string>('Local Host');
  const [terminalDimensions, setTerminalDimensions] = useState({ cols: 80, rows: 24 });
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<Terminal | null>(null);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = useCallback((url: string) => {
    setConnState('awaiting_approval');
    setDisconnectReason(null);

    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    socketRef.current = ws;

    ws.onopen = () => {
      setConnState('connected');
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
              setDisconnectReason(frame.reason || 'Session closed by host');
              setConnState('disconnected');
              break;
            case 'permission':
              setPermission(frame.mode);
              break;
          }
        } catch {
          // If frame decoding fails, treat raw bytes as terminal output (loopback raw mode)
          if (terminalRef.current) {
            terminalRef.current.write(bytes);
          }
        }
      } else if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'registered') {
            setConnState('connected');
          } else if (msg.type === 'join_result' && msg.status === 'connected') {
            setConnState('connected');
            if (msg.hostname) setRemoteHostname(msg.hostname);
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
      setDisconnectReason('WebSocket connection error');
      setConnState('disconnected');
    };
  }, []);

  const handleConnectLocal = () => {
    const wsUrl = `ws://${window.location.hostname || '127.0.0.1'}:3000/ws`;
    setConnectionMode('loopback');
    setRemoteHostname('Local Host PTY');
    connectWebSocket(wsUrl);
  };

  const handleConnectCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPairingCode(pairingCode)) return;

    // Connect to signaling server
    const signalingUrl = `ws://${window.location.hostname || '127.0.0.1'}:8080/ws`;
    setConnectionMode('webrtc');
    connectWebSocket(signalingUrl);
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setConnState('idle');
  };

  const handleTerminalInput = (input: string) => {
    if (permission === PermissionMode.ReadOnly) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const frame = encodeData(input);
      socketRef.current.send(frame.buffer as ArrayBuffer);
    }
  };

  const handleTerminalResize = (cols: number, rows: number) => {
    setTerminalDimensions({ cols, rows });
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const frame = encodeResize(cols, rows);
      socketRef.current.send(frame.buffer as ArrayBuffer);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Header Navigation Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-slate-100 flex items-center space-x-2">
              <span>Shellvyn</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
                v0.1.0
              </span>
            </h1>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center space-x-3">
          {connState === 'connected' && (
            <>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-medium">
                <Wifi className="w-3.5 h-3.5 animate-pulse" />
                <span className="capitalize">{connectionMode}</span>
              </div>

              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  permission === PermissionMode.Interactive
                    ? 'bg-sky-950/60 border-sky-800/60 text-sky-400'
                    : 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                }`}
              >
                {permission === PermissionMode.Interactive ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Interactive</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Read-Only</span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-1 text-xs text-slate-400 font-mono">
                <span>{remoteHostname}</span>
              </div>

              <button
                onClick={handleDisconnect}
                className="flex items-center space-x-1 px-3 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </>
          )}

          {connState === 'idle' && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              <span>Ready to connect</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {connState === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-radial from-slate-900/80 to-slate-950">
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Join Terminal Session</h2>
                  <p className="text-xs text-slate-400">
                    Zero-Knowledge E2EE Peer-to-Peer Terminal Sharing
                  </p>
                </div>
              </div>

              <form onSubmit={handleConnectCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Host Pairing Code
                  </label>
                  <input
                    type="text"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(normalizePairingCode(e.target.value))}
                    placeholder="KV7M-9X2P"
                    maxLength={9}
                    className="w-full h-12 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-4 text-center text-xl font-mono tracking-widest text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition placeholder:text-slate-600 uppercase"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                    8-character Crockford Base32 code provided by the host agent
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!isValidPairingCode(pairingCode)}
                  className="w-full h-11 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-medium rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-sky-600/20"
                >
                  <span>Connect to Host</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-900 px-3 text-slate-500 uppercase font-mono">
                    Development Mode
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConnectLocal}
                className="w-full h-10 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Connect to Local PTY Agent (ws://127.0.0.1:3000/ws)</span>
              </button>
            </div>
          </div>
        )}

        {connState === 'awaiting_approval' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-400 animate-spin">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-100">Connecting to Host...</h3>
              <p className="text-xs text-slate-400">
                Establishing WebSocket loopback and requesting terminal access.
              </p>
              <button
                onClick={handleDisconnect}
                className="px-4 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {connState === 'connected' && (
          <TerminalView
            terminalRef={terminalRef}
            onInput={handleTerminalInput}
            onResize={handleTerminalResize}
            readOnly={permission === PermissionMode.ReadOnly}
          />
        )}

        {connState === 'disconnected' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <WifiOff className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-100">Session Disconnected</h3>
              <p className="text-xs text-slate-400">
                {disconnectReason || 'The remote connection has ended.'}
              </p>
              <button
                onClick={handleDisconnect}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition cursor-pointer"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom Status Bar */}
      <footer className="h-7 border-t border-slate-800 bg-slate-950 px-4 flex items-center justify-between text-[11px] text-slate-500 font-mono select-none">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3 h-3 text-sky-400" />
            <span className="text-slate-400">ChaCha20-Poly1305 E2EE</span>
          </div>
          <div>
            <span>Wire: </span>
            <span className="text-slate-400">Shellvyn Binary v2</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div>
            <span>Geometry: </span>
            <span className="text-slate-400">
              {terminalDimensions.cols}x{terminalDimensions.rows}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-400">Online</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
