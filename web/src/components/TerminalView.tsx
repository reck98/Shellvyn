import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

export const DARK_TERMINAL_THEME = {
  background: '#090d14',
  foreground: '#f1f5f9',
  cursor: '#38bdf8',
  cursorAccent: '#090d14',
  selectionBackground: '#223048',
  selectionForeground: '#ffffff',
  black: '#090d14',
  red: '#f87171',
  green: '#34d399',
  yellow: '#fbbf24',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#38bdf8',
  white: '#f1f5f9',
  brightBlack: '#475569',
  brightRed: '#ef4444',
  brightGreen: '#10b981',
  brightYellow: '#f59e0b',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#0ea5e9',
  brightWhite: '#ffffff',
};

export const LIGHT_TERMINAL_THEME = {
  background: '#ffffff',
  foreground: '#0f172a',
  cursor: '#0284c7',
  cursorAccent: '#ffffff',
  selectionBackground: '#e2e8f0',
  selectionForeground: '#0f172a',
  black: '#0f172a',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#f8fafc',
  brightBlack: '#64748b',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#06b6d4',
  brightWhite: '#0f172a',
};

interface TerminalViewProps {
  onInput?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  readOnly?: boolean;
  terminalRef?: React.MutableRefObject<Terminal | null>;
  theme?: 'light' | 'dark';
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  onInput,
  onResize,
  readOnly = false,
  terminalRef,
  theme = 'dark',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const activeTheme = theme === 'light' ? LIGHT_TERMINAL_THEME : DARK_TERMINAL_THEME;

    // 1. Initialize xterm.js instance
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13.5,
      fontFamily: `'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace`,
      lineHeight: 1.35,
      letterSpacing: 0,
      theme: activeTheme,
      allowTransparency: false,
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
      // Fallback to standard canvas rendering
    }

    // Initial fit & focus
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
        term.focus();
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

  // Dynamically update theme if it toggles during an active session
  useEffect(() => {
    if (terminalRef?.current) {
      terminalRef.current.options.theme =
        theme === 'light' ? LIGHT_TERMINAL_THEME : DARK_TERMINAL_THEME;
    }
  }, [theme, terminalRef]);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col bg-[var(--term-bg)]">
      <div ref={containerRef} className="w-full h-full p-2" />
    </div>
  );
};
