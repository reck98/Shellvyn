const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PUBLIC_DIR = path.resolve(__dirname, '../web/public');
const DIST_DIR = path.resolve(__dirname, '../web/dist');
const LOGO_DIR = path.resolve(__dirname, '../docs/assets/logo');
const SCRATCH_DIR = path.resolve(__dirname, '../scratch');

if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });

// Function to generate a PNG from SVG at specific width/height
function generatePng(size, filename) {
  // Shellvyn brand icon: dark olive container + warm ivory terminal brackets + muted gold cursor
  // With subtle corner radius for high contrast in browser tabs
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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}" fill="none">
    <rect width="32" height="32" rx="7" fill="#0E120A" />
    <g transform="translate(4, 4) scale(0.5)">
      <path d="M 35 12 H 19 L 12 19 V 21 L 17.5 26.5 H 23" 
            stroke="#F5EFE3" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 13 36 H 29 L 36 29 V 27 L 30.5 21.5 H 25" 
            stroke="#F5EFE3" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="21" y="21" width="6" height="6" rx="1" fill="#D4A23D" />
    </g>
  </svg>
</body>
</html>`;

  const htmlPath = path.join(SCRATCH_DIR, `temp-${size}.html`);
  const pngPath = path.join(SCRATCH_DIR, filename);
  fs.writeFileSync(htmlPath, htmlContent);

  const cmd = `"${CHROME_PATH}" --headless=new --disable-gpu --default-background-color=00000000 --screenshot="${pngPath}" --window-size=${size},${size} "file:///${htmlPath.replace(/\\/g, '/')}"`;
  execSync(cmd, { stdio: 'ignore' });
  return fs.readFileSync(pngPath);
}

// Generate PNGs at 16, 32, 48, 180
console.log('Generating favicon PNG buffers...');
const png16 = generatePng(16, 'fav-16.png');
const png32 = generatePng(32, 'fav-32.png');
const png48 = generatePng(48, 'fav-48.png');
const png180 = generatePng(180, 'apple-touch-icon.png');

// Build an ICO file containing 16x16, 32x32, 48x48 PNG images
function buildIco(images) {
  // images: array of { width, height, buffer }
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + count * dirEntrySize;

  let totalSize = dirSize;
  for (const img of images) {
    totalSize += img.buffer.length;
  }

  const out = Buffer.alloc(totalSize);

  // ICONDIR header
  out.writeUInt16LE(0, 0); // reserved
  out.writeUInt16LE(1, 2); // type 1 = icon
  out.writeUInt16LE(count, 4); // count

  let currentOffset = dirSize;
  for (let i = 0; i < count; i++) {
    const img = images[i];
    const entryOffset = headerSize + i * dirEntrySize;

    out.writeUInt8(img.width === 256 ? 0 : img.width, entryOffset); // width
    out.writeUInt8(img.height === 256 ? 0 : img.height, entryOffset + 1); // height
    out.writeUInt8(0, entryOffset + 2); // color count
    out.writeUInt8(0, entryOffset + 3); // reserved
    out.writeUInt16LE(1, entryOffset + 4); // color planes
    out.writeUInt16LE(32, entryOffset + 6); // bit count
    out.writeUInt32LE(img.buffer.length, entryOffset + 8); // bytes in resource
    out.writeUInt32LE(currentOffset, entryOffset + 12); // image offset

    img.buffer.copy(out, currentOffset);
    currentOffset += img.buffer.length;
  }

  return out;
}

const icoBuffer = buildIco([
  { width: 16, height: 16, buffer: png16 },
  { width: 32, height: 32, buffer: png32 },
  { width: 48, height: 48, buffer: png48 }
]);

// Write to web/public
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.png'), png32);
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-16.png'), png16);
fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), png180);

// Also copy to web/dist if dist exists
if (fs.existsSync(DIST_DIR)) {
  fs.writeFileSync(path.join(DIST_DIR, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(DIST_DIR, 'favicon.png'), png32);
  fs.writeFileSync(path.join(DIST_DIR, 'favicon-16.png'), png16);
  fs.writeFileSync(path.join(DIST_DIR, 'apple-touch-icon.png'), png180);
}

// Copy to docs/assets/logo
fs.writeFileSync(path.join(LOGO_DIR, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(LOGO_DIR, 'apple-touch-icon.png'), png180);

console.log('✓ Successfully created favicon.ico, favicon.png, favicon-16.png, apple-touch-icon.png');
