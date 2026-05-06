const {
  app,
  BrowserWindow
} = require("electron");

function createWindow() {

  const win = new BrowserWindow({
    width: 1400,
    height: 900
  });

  // LOAD LIVE WEBSITE
  win.loadURL(
    "https://marthington.vercel.app"
  );
}

app.whenReady().then(() => {

  createWindow();

  app.on("activate", () => {

    if (
      BrowserWindow.getAllWindows().length === 0
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