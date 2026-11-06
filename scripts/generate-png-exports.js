const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const LOGO_DIR = path.resolve(__dirname, '../docs/assets/logo');
const PNG_DIR = path.join(LOGO_DIR, 'png');
const PUBLIC_DIR = path.resolve(__dirname, '../web/public');
const SCRATCH_DIR = path.resolve(__dirname, '../scratch');

const sizes = [32, 64, 128, 256, 512];

// Generate an HTML harness for rendering the symbol at exact size on transparent/olive canvas
for (const size of sizes) {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
  svg { width: 100%; height: 100%; }
</style>
</head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}" fill="none">
    <path d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23" 
          stroke="#4F5B2A" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25" 
          stroke="#4F5B2A" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
    <rect x="21.5" y="21.5" width="5" height="5" rx="1" fill="#B8892D" />
  </svg>
</body>
</html>`;

  const htmlPath = path.join(SCRATCH_DIR, `symbol-${size}.html`);
  const pngPath = path.join(PNG_DIR, `shellvyn-symbol-${size}.png`);
  fs.writeFileSync(htmlPath, htmlContent);

  const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --default-background-color=00000000 --screenshot="${pngPath}" --window-size=${size},${size} "file:///${htmlPath.replace(/\\/g, '/')}"`;
  execSync(cmd, { stdio: 'ignore' });
  console.log(`Generated shellvyn-symbol-${size}.png`);
}

// Generate primary logo PNG (512px wide)
const logoHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 640px; height: 120px; overflow: hidden; background: #0E120A; display: flex; align-items: center; justify-content: center; }
  svg { width: 560px; height: 98px; }
</style>
</head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 56" fill="none">
    <g transform="translate(6, 7)">
      <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
        <path d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23" 
              stroke="#F5EFE3" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25" 
              stroke="#F5EFE3" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="21.5" y="21.5" width="5" height="5" rx="1" fill="#D4A23D" />
      </svg>
    </g>
    <text x="60" y="33" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif" 
          font-size="24" font-weight="700" letter-spacing="-0.4" fill="#F5EFE3">
      Shell<tspan font-weight="500">vyn</tspan>
    </text>
    <text x="61" y="46" font-family="'JetBrains Mono', 'Fira Code', monospace" 
          font-size="8.5" font-weight="600" letter-spacing="1.5" fill="#858D73">
      ZERO-KNOWLEDGE TERMINAL
    </text>
  </svg>
</body>
</html>`;

const logoHtmlPath = path.join(SCRATCH_DIR, 'logo-512.html');
const logoPngPath = path.join(PNG_DIR, 'shellvyn-logo-512.png');
fs.writeFileSync(logoHtmlPath, logoHtml);
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --screenshot="${logoPngPath}" --window-size=640,120 "file:///${logoHtmlPath.replace(/\\/g, '/')}"`, { stdio: 'ignore' });
console.log('Generated shellvyn-logo-512.png');

// Generate favicon 32x32 PNG
const favHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 32px; height: 32px; overflow: hidden; background: transparent; }
</style>
</head>
<body>
  ${fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), 'utf-8')}
</body>
</html>`;
const favHtmlPath = path.join(SCRATCH_DIR, 'fav-32.html');
const favPngPath = path.join(PUBLIC_DIR, 'favicon.png');
fs.writeFileSync(favHtmlPath, favHtml);
execSync(`"${CHROME_PATH}" --headless=new --disable-gpu --default-background-color=00000000 --screenshot="${favPngPath}" --window-size=32,32 "file:///${favHtmlPath.replace(/\\/g, '/')}"`, { stdio: 'ignore' });
fs.copyFileSync(favPngPath, path.join(PNG_DIR, 'shellvyn-favicon-32.png'));
console.log('Generated favicon.png');
