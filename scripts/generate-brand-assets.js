const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOGO_DIR = path.resolve(__dirname, '../docs/assets/logo');
const PNG_DIR = path.join(LOGO_DIR, 'png');
const PUBLIC_DIR = path.resolve(__dirname, '../web/public');

if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });
if (!fs.existsSync(PNG_DIR)) fs.mkdirSync(PNG_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Brand Colors
const IVORY = '#F5EFE3';
const OLIVE = '#4F5B2A';
const GOLD = '#B8892D';
const GOLD_LIGHT = '#D4A23D';
const DARK_BG = '#0E120A';

// 1. Standalone Symbol Generator
function createSymbolSvg({ mode = 'adaptive' }) {
  let strokeLight = OLIVE;
  let goldLight = GOLD;
  let strokeDark = IVORY;
  let goldDark = GOLD_LIGHT;

  if (mode === 'light') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" fill="none">
  <!-- Shellvyn Symbol (Light Mode) -->
  <path d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23" 
        stroke="${strokeLight}" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25" 
        stroke="${strokeLight}" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
  <rect x="21.5" y="21.5" width="5" height="5" rx="1" fill="${goldLight}" />
</svg>`;
  }

  if (mode === 'dark') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" fill="none">
  <!-- Shellvyn Symbol (Dark Mode) -->
  <path d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23" 
        stroke="${strokeDark}" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25" 
        stroke="${strokeDark}" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
  <rect x="21.5" y="21.5" width="5" height="5" rx="1" fill="${goldDark}" />
</svg>`;
  }

  // Adaptive for GitHub & browser themes
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" fill="none">
  <style>
    .shellvyn-stroke { stroke: ${strokeLight}; }
    .shellvyn-gold { fill: ${goldLight}; }
    @media (prefers-color-scheme: dark) {
      .shellvyn-stroke { stroke: ${strokeDark}; }
      .shellvyn-gold { fill: ${goldDark}; }
    }
  </style>
  <path class="shellvyn-stroke" d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23" 
        stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
  <path class="shellvyn-stroke" d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25" 
        stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
  <rect class="shellvyn-gold" x="21.5" y="21.5" width="5" height="5" rx="1" />
</svg>`;
}

// 2. Favicon Generator (includes dark rounded tile for crisp tab visibility across light/dark OS tabs)
function createFaviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none">
  <!-- Subtle dark olive backdrop for high-contrast tab visibility -->
  <rect width="32" height="32" rx="7" fill="#0E120A" />
  <g transform="translate(4, 4) scale(0.5)">
    <!-- Upper Host Terminal Bracket -->
    <path d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23" 
          stroke="${IVORY}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Lower Viewer Terminal Bracket -->
    <path d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25" 
          stroke="${IVORY}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Central Active Terminal Cursor -->
    <rect x="21" y="21" width="6" height="6" rx="1" fill="${GOLD_LIGHT}" />
  </g>
</svg>`;
}

// 3. Primary Horizontal Logo Generator (Symbol + Wordmark + Tagline)
function createLogoSvg({ mode = 'adaptive' }) {
  let textLight = OLIVE;
  let strokeLight = OLIVE;
  let goldLight = GOLD;
  let tagLight = '#727c5b';

  let textDark = IVORY;
  let strokeDark = IVORY;
  let goldDark = GOLD_LIGHT;
  let tagDark = '#858d73';

  if (mode === 'light') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 56" width="320" height="56" fill="none">
  <!-- Shellvyn Primary Logo (Light Mode) -->
  <g transform="translate(6, 7)">
    <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
      <path d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23" 
            stroke="${strokeLight}" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25" 
            stroke="${strokeLight}" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="21.5" y="21.5" width="5" height="5" rx="1" fill="${goldLight}" />
    </svg>
  </g>
  <text x="60" y="33" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif" 
        font-size="24" font-weight="700" letter-spacing="-0.4" fill="${textLight}">
    Shell<tspan font-weight="500">vyn</tspan>
  </text>
  <text x="61" y="46" font-family="'JetBrains Mono', 'Fira Code', monospace" 
        font-size="8.5" font-weight="600" letter-spacing="1.5" fill="${tagLight}">
    ZERO-KNOWLEDGE TERMINAL
  </text>
</svg>`;
  }

  if (mode === 'dark') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 56" width="320" height="56" fill="none">
  <!-- Shellvyn Primary Logo (Dark Mode) -->
  <g transform="translate(6, 7)">
    <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
      <path d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23" 
            stroke="${strokeDark}" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25" 
            stroke="${strokeDark}" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="21.5" y="21.5" width="5" height="5" rx="1" fill="${goldDark}" />
    </svg>
  </g>
  <text x="60" y="33" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif" 
        font-size="24" font-weight="700" letter-spacing="-0.4" fill="${textDark}">
    Shell<tspan font-weight="500">vyn</tspan>
  </text>
  <text x="61" y="46" font-family="'JetBrains Mono', 'Fira Code', monospace" 
        font-size="8.5" font-weight="600" letter-spacing="1.5" fill="${tagDark}">
    ZERO-KNOWLEDGE TERMINAL
  </text>
</svg>`;
  }

  // Adaptive
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 56" width="320" height="56" fill="none">
  <style>
    .shellvyn-stroke { stroke: ${strokeLight}; }
    .shellvyn-text { fill: ${textLight}; }
    .shellvyn-gold { fill: ${goldLight}; }
    .shellvyn-tag { fill: ${tagLight}; }
    @media (prefers-color-scheme: dark) {
      .shellvyn-stroke { stroke: ${strokeDark}; }
      .shellvyn-text { fill: ${textDark}; }
      .shellvyn-gold { fill: ${goldDark}; }
      .shellvyn-tag { fill: ${tagDark}; }
    }
  </style>
  <g transform="translate(6, 7)">
    <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
      <path class="shellvyn-stroke" d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23" 
            stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
      <path class="shellvyn-stroke" d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25" 
            stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
      <rect class="shellvyn-gold" x="21.5" y="21.5" width="5" height="5" rx="1" />
    </svg>
  </g>
  <text class="shellvyn-text" x="60" y="33" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif" 
        font-size="24" font-weight="700" letter-spacing="-0.4">
    Shell<tspan font-weight="500">vyn</tspan>
  </text>
  <text class="shellvyn-tag" x="61" y="46" font-family="'JetBrains Mono', 'Fira Code', monospace" 
        font-size="8.5" font-weight="600" letter-spacing="1.5">
    ZERO-KNOWLEDGE TERMINAL
  </text>
</svg>`;
}

// 4. Horizontal Wordmark (No sub-label)
function createWordmarkSvg({ mode = 'adaptive' }) {
  let textLight = OLIVE;
  let textDark = IVORY;

  if (mode === 'light') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40" width="160" height="40" fill="none">
  <text x="0" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif" 
        font-size="30" font-weight="700" letter-spacing="-0.5" fill="${textLight}">
    Shell<tspan font-weight="500">vyn</tspan>
  </text>
</svg>`;
  }

  if (mode === 'dark') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40" width="160" height="40" fill="none">
  <text x="0" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif" 
        font-size="30" font-weight="700" letter-spacing="-0.5" fill="${textDark}">
    Shell<tspan font-weight="500">vyn</tspan>
  </text>
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40" width="160" height="40" fill="none">
  <style>
    .shellvyn-word { fill: ${textLight}; }
    @media (prefers-color-scheme: dark) {
      .shellvyn-word { fill: ${textDark}; }
    }
  </style>
  <text class="shellvyn-word" x="0" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif" 
        font-size="30" font-weight="700" letter-spacing="-0.5">
    Shell<tspan font-weight="500">vyn</tspan>
  </text>
</svg>`;
}

// Write SVG files
fs.writeFileSync(path.join(LOGO_DIR, 'shellvyn-symbol.svg'), createSymbolSvg({ mode: 'adaptive' }));
fs.writeFileSync(path.join(LOGO_DIR, 'shellvyn-symbol-light.svg'), createSymbolSvg({ mode: 'light' }));
fs.writeFileSync(path.join(LOGO_DIR, 'shellvyn-symbol-dark.svg'), createSymbolSvg({ mode: 'dark' }));

fs.writeFileSync(path.join(LOGO_DIR, 'shellvyn-logo.svg'), createLogoSvg({ mode: 'adaptive' }));
fs.writeFileSync(path.join(LOGO_DIR, 'shellvyn-logo-light.svg'), createLogoSvg({ mode: 'light' }));
fs.writeFileSync(path.join(LOGO_DIR, 'shellvyn-logo-dark.svg'), createLogoSvg({ mode: 'dark' }));

fs.writeFileSync(path.join(LOGO_DIR, 'shellvyn-wordmark.svg'), createWordmarkSvg({ mode: 'adaptive' }));
fs.writeFileSync(path.join(LOGO_DIR, 'shellvyn-wordmark-light.svg'), createWordmarkSvg({ mode: 'light' }));
fs.writeFileSync(path.join(LOGO_DIR, 'shellvyn-wordmark-dark.svg'), createWordmarkSvg({ mode: 'dark' }));

// Write Favicon to web/public and docs/assets/logo
const faviconContent = createFaviconSvg();
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), faviconContent);
fs.writeFileSync(path.join(LOGO_DIR, 'favicon.svg'), faviconContent);

console.log('SVG Brand Assets written successfully.');
