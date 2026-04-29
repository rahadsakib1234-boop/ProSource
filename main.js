const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const licenseFilePath = path.join(app.getPath('userData'), 'license.key');
const userDataPath = path.join(app.getPath('userData'), 'user-info.json');

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ========== LICENSE HANDLERS ==========

// Check if license exists and is valid
ipcMain.handle('check-license', () => {
  try {
    if (fs.existsSync(licenseFilePath)) {
      const key = fs.readFileSync(licenseFilePath, 'utf-8').trim();
      const pattern = /^PROSRC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
      if (pattern.test(key)) {
        if (fs.existsSync(userDataPath)) {
          const userInfo = JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));
          return { valid: true, userName: userInfo.name, userEmail: userInfo.email };
        }
        return { valid: true };
      }
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
});

// Save license key and user info (3 parameters)
ipcMain.handle('save-license', (event, key, userName, userEmail) => {
  try {
    const pattern = /^PROSRC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (pattern.test(key)) {
      // Save license key
      fs.writeFileSync(licenseFilePath, key, 'utf-8');
      
      // Save user info
      const userInfo = { name: userName, email: userEmail, activatedAt: new Date().toISOString() };
      fs.writeFileSync(userDataPath, JSON.stringify(userInfo, null, 2), 'utf-8');
      
      return true;
    }
    return false;
  } catch {
    return false;
  }
});

// Get user info
ipcMain.handle('get-user-info', () => {
  try {
    if (fs.existsSync(userDataPath)) {
      return JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));
    }
    return null;
  } catch {
    return null;
  }
});