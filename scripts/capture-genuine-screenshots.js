const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const AGENT_PATH = path.resolve(__dirname, '../target/debug/shellvyn-agent.exe');
const SCREENSHOTS_DIR = path.resolve(__dirname, '../docs/assets/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  ready() {
    return new Promise(resolve => {
      if (this.ws.readyState === WebSocket.OPEN) resolve();
      else this.ws.onopen = () => resolve();
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log('[1/5] Starting Shellvyn Host Agent in local loopback mode...');
  const agentProc = spawn(AGENT_PATH, ['local', '--port', '3000'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit'
  });

  agentProc.on('error', (err) => {
    console.error('Agent failed to start:', err);
  });

  // Wait for port 3000 to be responsive
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      await new Promise((res, rej) => {
        const req = http.get('http://127.0.0.1:3000', r => {
          if (r.statusCode === 200) res();
          else rej();
        });
        req.on('error', rej);
      });
      serverReady = true;
      break;
    } catch {
      // Keep waiting
    }
  }

  if (!serverReady) {
    console.error('Timeout waiting for Shellvyn local server on port 3000');
    agentProc.kill();
    process.exit(1);
  }
  console.log('✓ Shellvyn local server active on http://127.0.0.1:3000');

  console.log('[2/5] Launching Chrome with CDP on port 9222...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--window-size=1440,900',
    '--hide-scrollbars',
    'about:blank'
  ]);

  await sleep(1500);

  try {
    const targets = await fetchJson('http://127.0.0.1:9222/json');
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found in Chrome');

    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.ready();
    console.log('✓ CDP connection established');

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('[3/5] Navigating to http://127.0.0.1:3000 (Lobby)...');
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:3000' });
    await sleep(2500); // Wait for fonts, CSS, and layout

    // Pre-populate pairing code to KV7M-9X2P for a pristine, representative visual
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('input[type="text"]');
        if (input) {
          input.value = 'KV7M-9X2P';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`
    });
    await sleep(500);

    // Capture Lobby Screenshot
    console.log('Capturing Lobby screenshots...');
    const lobbyPng = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'shellvyn-lobby.png'), Buffer.from(lobbyPng.data, 'base64'));

    const lobbyWebp = await cdp.send('Page.captureScreenshot', { format: 'webp', quality: 90 });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'shellvyn-lobby.webp'), Buffer.from(lobbyWebp.data, 'base64'));
    console.log('✓ shellvyn-lobby.png and shellvyn-lobby.webp saved');

    console.log('[4/5] Connecting to Terminal session...');
    // Click "Connect to Local PTY (127.0.0.1:3000)"
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loopbackBtn = buttons.find(b => b.textContent.includes('Connect to Local PTY') || b.textContent.includes('127.0.0.1:3000'));
        if (loopbackBtn) {
          loopbackBtn.click();
          return true;
        }
        return false;
      })()`
    });

    // Wait for WebSocket connection and ConPTY banner
    console.log('Waiting for terminal connection...');
    await sleep(2000);

    // Focus terminal and type demonstration commands
    console.log('Dispatching terminal keystrokes...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const textarea = document.querySelector('.xterm-helper-textarea');
        if (textarea) textarea.focus();
      })()`
    });
    await sleep(500);

    // Send cls to clear screen cleanly
    for (const char of 'cls\r') {
      await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: char });
      await sleep(20);
    }
    await sleep(1000);

    // Run clean core tests command: cargo test -p shellvyn-core
    for (const char of 'cargo test -p shellvyn-core\r') {
      await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: char });
      await sleep(20);
    }
    await sleep(3000); // Wait for test execution and terminal rendering

    console.log('Capturing Connected Terminal Dashboard screenshots...');
    const dashPng = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'shellvyn-dashboard.png'), Buffer.from(dashPng.data, 'base64'));

    const dashWebp = await cdp.send('Page.captureScreenshot', { format: 'webp', quality: 92 });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'shellvyn-dashboard.webp'), Buffer.from(dashWebp.data, 'base64'));
    console.log('✓ shellvyn-dashboard.png and shellvyn-dashboard.webp saved');

    cdp.close();
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    console.log('[5/5] Tearing down Chrome and local agent...');
    chromeProc.kill();
    agentProc.kill();
    console.log('✓ Clean shutdown complete');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
