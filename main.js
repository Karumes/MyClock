const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function getLaunchMode() {
  const args = process.argv.slice(1).map((arg) => String(arg).toLowerCase());
  if (args.some((arg) => arg === "/s" || arg.startsWith("/s:"))) return "clock";
  return "settings";
}

function createWindow() {
  const mode = getLaunchMode();
  const isClockMode = mode === "clock";
  const win = new BrowserWindow({
    width: isClockMode ? undefined : 800,
    height: isClockMode ? undefined : 600,
    fullscreen: isClockMode,
    frame: !isClockMode,
    alwaysOnTop: isClockMode,
    backgroundColor: "#000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isClockMode) {
    win.setAlwaysOnTop(true, "screen-saver");
    win.webContents.on("did-finish-load", () => {
      win.webContents.insertCSS("* { cursor: none !important; }");
    });
  }

  win.loadFile(path.join(__dirname, "public", "index.html"), {
    query: { mode },
  });
}

ipcMain.on("close-app", () => {
  app.quit();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
