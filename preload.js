const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkLicense: () => ipcRenderer.invoke('check-license'),
  saveLicense: (key, userName, userEmail) => ipcRenderer.invoke('save-license', key, userName, userEmail),
  getUserInfo: () => ipcRenderer.invoke('get-user-info')
});