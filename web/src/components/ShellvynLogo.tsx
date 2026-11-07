import React from 'react';

interface ShellvynSymbolProps {
  className?: string;
  size?: number | string;
}

/**
 * Shellvyn Official Brand Mark
 * Precise geometric interlocking "S" path with centered gold core.
 * Stroke automatically respects theme (--logo-stroke) and square uses --gold.
 */
export const ShellvynSymbol: React.FC<ShellvynSymbolProps> = ({
  className = 'w-6 h-6',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Shellvyn logo symbol"
    >
      {/* Upper interlocking path */}
      <path
        d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23"
        stroke="var(--logo-stroke, currentColor)"
        strokeWidth="4.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lower interlocking path */}
      <path
        d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25"
        stroke="var(--logo-stroke, currentColor)"
        strokeWidth="4.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center core accent square */}
      <rect x="21.5" y="21.5" width="5" height="5" rx="1" fill="var(--gold)" />
    </svg>
  );
};

interface ShellvynLogoProps {
  className?: string;
  symbolSize?: string;
  showSubtitle?: boolean;
}

export const ShellvynLogo: React.FC<ShellvynLogoProps> = ({
  className = '',
  symbolSize = 'w-6 h-6',
  showSubtitle = false,
}) => {
  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      <ShellvynSymbol className={`${symbolSize} shrink-0`} />
      <div className="flex flex-col">
        <span className="font-sans text-base font-bold tracking-tight text-[var(--text-primary)] leading-none select-none">
          Shell<span className="font-medium text-[var(--text-secondary)]">vyn</span>
        </span>
        {showSubtitle && (
          <span className="font-mono text-[8px] font-semibold tracking-[0.16em] uppercase text-[var(--text-muted)] mt-0.5 select-none">
            Zero-Knowledge Terminal
          </span>
        )}
      </div>
    </div>
  );
};
