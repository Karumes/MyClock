const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  closeApp: () => ipcRenderer.send("close-app"),
  // 設定を物理JSONファイルへ保存・ロードするAPIを追加
  saveSettings: (data) => ipcRenderer.invoke("save-settings", data),
  loadSettings: () => ipcRenderer.invoke("load-settings")
});