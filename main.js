const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow;
let licenseFilePath;
let userDataPath;

const PUBLIC_KEY_PEM =
  process.env.PROSOURCE_LICENSE_PUBLIC_KEY ||
  `-----BEGIN PUBLIC KEY-----
REPLACE_WITH_PUBLIC_KEY
-----END PUBLIC KEY-----`;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#f7f8fa'
  });

  mainWindow.loadFile('index.html');
  mainWindow.maximize();
  mainWindow.show();
  mainWindow.setMenuBarVisibility(false);
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
}

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function verifyLicenseToken(token) {
  const [payloadPart, signaturePart] = String(token || '').trim().split('.');
  if (!payloadPart || !signaturePart) return { valid: false };

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadPart).toString('utf8'));
  } catch {
    return { valid: false };
  }

  try {
    const ok = crypto.verify(
      null,
      Buffer.from(payloadPart, 'utf8'),
      PUBLIC_KEY_PEM,
      base64UrlDecode(signaturePart)
    );

    if (!ok) return { valid: false };

    if (payload.expiresAt && Date.now() > Date.parse(payload.expiresAt)) {
      return { valid: false, expired: true, payload };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

function loadLicenseState() {
  if (!licenseFilePath) return { valid: false };
  const token = fs.existsSync(licenseFilePath) ? fs.readFileSync(licenseFilePath, 'utf8').trim() : '';
  return verifyLicenseToken(token);
}

app.whenReady().then(() => {
  const userDataDir = app.getPath('userData');
  licenseFilePath = path.join(userDataDir, 'license.key');
  userDataPath = path.join(userDataDir, 'user-info.json');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('check-license', () => {
  const license = loadLicenseState();
  if (!license.valid) return { valid: false };

  const savedUser = readJson(userDataPath) || {};

  return {
    valid: true,
    userName: savedUser.name || license.payload?.name || '',
    userEmail: savedUser.email || license.payload?.email || '',
    expiresAt: license.payload?.expiresAt || null,
    seats: license.payload?.seats ?? 2
  };
});

ipcMain.handle('save-license', (event, key, userName, userEmail) => {
  const license = verifyLicenseToken(key);
  if (!license.valid) return false;

  fs.writeFileSync(licenseFilePath, String(key).trim(), 'utf8');

  writeJson(userDataPath, {
    name: userName || license.payload.name || '',
    email: userEmail || license.payload.email || '',
    product: license.payload.product || 'ProSource CRM',
    seats: license.payload.seats ?? 2,
    issuedAt: license.payload.issuedAt || null,
    expiresAt: license.payload.expiresAt || null,
    activatedAt: new Date().toISOString()
  });

  return true;
});

ipcMain.handle('get-user-info', () => readJson(userDataPath));
