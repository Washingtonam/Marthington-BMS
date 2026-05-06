const { app, BrowserWindow } = require("electron");

const path = require("path");

function createWindow() {

  const win = new BrowserWindow({
    width: 1400,
    height: 900,

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // DEV MODE
  if (!app.isPackaged) {

    win.loadURL("http://localhost:5173");

  }

  // PRODUCTION MODE
  else {

    win.loadFile(
      path.join(__dirname, "../dist/index.html")
    );
  }
}

app.whenReady().then(() => {
  createWindow();
});