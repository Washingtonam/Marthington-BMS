const {
  app,
  BrowserWindow
} = require("electron");

const path = require("path");

const isDev =
  !app.isPackaged;

function createWindow() {

  const win =
    new BrowserWindow({

      width: 1400,
      height: 900,

      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

  // DEV MODE
  if (isDev) {

    win.loadURL(
      "http://localhost:5173"
    );

    win.webContents.openDevTools();

  }

  // PRODUCTION MODE
  else {

    win.loadFile(
      path.join(
        __dirname,
        "../frontend/dist/index.html"
      )
    );
  }
}

app.whenReady().then(() => {

  createWindow();

  app.on("activate", () => {

    if (
      BrowserWindow.getAllWindows()
        .length === 0
    ) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {

  if (process.platform !== "darwin") {
    app.quit();
  }
});