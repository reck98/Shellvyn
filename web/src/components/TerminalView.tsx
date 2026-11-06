import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

export const DARK_TERMINAL_THEME = {
  background: '#0b0e08',
  foreground: '#f5efe3',
  cursor: '#d4a23d',
  cursorAccent: '#0b0e08',
  selectionBackground: '#2a351d',
  selectionForeground: '#ffffff',
  black: '#1a2214',
  red: '#f87171',
  green: '#86a759',
  yellow: '#d4a23d',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#38bdf8',
  white: '#f5efe3',
  brightBlack: '#5b664b',
  brightRed: '#ef4444',
  brightGreen: '#a3c672',
  brightYellow: '#e7ba58',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#7dd3fc',
  brightWhite: '#ffffff',
};

export const LIGHT_TERMINAL_THEME = {
  background: '#faf7f0',
  foreground: '#1c2210',
  cursor: '#4f5b2a',
  cursorAccent: '#faf7f0',
  selectionBackground: '#d8c9a8',
  selectionForeground: '#1c2210',
  black: '#1c2210',
  red: '#b91c1c',
  green: '#3b6e32',
  yellow: '#8f6719',
  blue: '#1d4ed8',
  magenta: '#7e22ce',
  cyan: '#0e7490',
  white: '#f5efe3',
  brightBlack: '#6b745a',
  brightRed: '#dc2626',
  brightGreen: '#4f8645',
  brightYellow: '#b8892d',
  brightBlue: '#2563eb',
  brightMagenta: '#9333ea',
  brightCyan: '#0891b2',
  brightWhite: '#0f1409',
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
