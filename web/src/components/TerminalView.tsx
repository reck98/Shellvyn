import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  onInput?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  readOnly?: boolean;
  terminalRef?: React.MutableRefObject<Terminal | null>;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  onInput,
  onResize,
  readOnly = false,
  terminalRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize xterm.js instance
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 14,
      fontFamily: `'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace`,
      theme: {
        background: '#020617', // slate-950
        foreground: '#f8fafc', // slate-50
        cursor: '#38bdf8', // sky-400
        cursorAccent: '#020617',
        selectionBackground: '#334155',
        selectionForeground: '#ffffff',
        black: '#0f172a',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f1f5f9',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      allowTransparency: true,
      scrollback: 10000,
      convertEol: true,
    });

    if (terminalRef) {
      terminalRef.current = term;
    }

    // 2. Load FitAddon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(containerRef.current);

    // 3. Try to load hardware-accelerated WebglAddon
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      term.loadAddon(webglAddon);
    } catch {
      // Fallback to standard canvas/DOM rendering
    }

    // Initial fit
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
        if (onResize) {
          onResize(term.cols, term.rows);
        }
      } catch {
        // Container might not be visible yet
      }
    });

    // 4. Handle keystrokes
    const inputDisposable = term.onData((data) => {
      if (!readOnly && onInput) {
        onInput(data);
      }
    });

    // 5. Observe resize on container
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          if (onResize) {
            onResize(term.cols, term.rows);
          }
        } catch {
          // Ignore transient resize errors
        }
      });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      inputDisposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
      if (terminalRef) {
        terminalRef.current = null;
      }
    };
  }, [readOnly]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
