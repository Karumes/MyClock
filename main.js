const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const settingsPath = path.join(app.getPath("userData"), "clock-settings.json");

function getLaunchMode() {
  const args = process.argv.slice(1).map((arg) => String(arg).toLowerCase().trim());
  
  // 厳格な前方一致判定を行い、インストールパスの「Programs」などの文字列への部分一致を回避します
  if (args.some(arg => arg === "/s" || arg.startsWith("/s:") || arg.startsWith("/s "))) {
    return "clock";
  }
  if (args.some(arg => arg === "/p" || arg.startsWith("/p:") || arg.startsWith("/p "))) {
    return "preview";
  }
  if (args.some(arg => arg === "/c" || arg.startsWith("/c:") || arg.startsWith("/c "))) {
    return "settings";
  }
  return "settings"; // 通常起動
}

const mode = getLaunchMode();

if (mode === "preview") {
  app.quit();
  process.exit(0);
}

ipcMain.handle("save-settings", (event, data) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save settings to file:", err);
    return false;
  }
});

ipcMain.handle("load-settings", () => {
  try {
    if (fs.existsSync(settingsPath)) {
      const rawData = fs.readFileSync(settingsPath, "utf-8");
      return JSON.parse(rawData);
    }
  } catch (err) {
    console.error("Failed to load settings from file:", err);
  }
  return null;
});

function createWindow() {
  const isClockMode = mode === "clock";
  const win = new BrowserWindow({
    width: isClockMode ? undefined : 1024,
    height: isClockMode ? undefined : 768,
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