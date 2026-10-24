/* OmniStax desktop: a window on omnistax.org. The app, its books and their
   downloads come from the site as they do in a browser; the shell adds the
   keys a browser keeps, CORS-free requests and its own updates
   (omnistax-web/docs/release-plan.md, decisions 10 to 15). */
const { app, BrowserWindow, Menu, dialog, net, session, shell } = require('electron');
const path = require('node:path');
const allowCors = require('./cors');

const SITE = process.env.OMNISTAX_URL || 'https://omnistax.org';
const ORIGIN = new URL(SITE).origin;
const LATEST = 'https://github.com/BlastWind/OmniStax/releases/latest/download';

/* No menu keys on Windows and Linux, so Ctrl+W, Ctrl+R and the rest reach the
   app. A Mac keeps Quit and Hide, and the clipboard roles its text fields need. */
const menu = () => Menu.setApplicationMenu(process.platform !== 'darwin' ? null : Menu.buildFromTemplate([
  { role: 'appMenu' },
  { label: 'Edit', submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
]));

const open = () => {
  const win = new BrowserWindow({
    width: 1280, height: 820, title: 'OmniStax', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  /* A link off the site opens in the reader's browser. */
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).origin === ORIGIN) return { action: 'allow' };
    void shell.openExternal(url); return { action: 'deny' };
  });
  void win.loadURL(SITE);
};

/* Semver of three numbers, the form electron-updater and the build use. */
const newer = (a, b) => { const [x, y] = [a, b].map((v) => v.split('.').map(Number)); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
/* Windows and Linux replace themselves on restart. An unsigned Mac app cannot,
   so it says a new version is out and opens the download page. */
const update = async () => {
  if (!app.isPackaged) return;
  if (process.platform !== 'darwin') { await require('electron-updater').autoUpdater.checkForUpdatesAndNotify(); return; }
  const text = await net.fetch(`${LATEST}/latest.yml`).then((r) => (r.ok ? r.text() : ''));
  const latest = /^version:\s*(\S+)/m.exec(text)?.[1];
  if (!latest || !newer(latest, app.getVersion())) return;
  const { response } = await dialog.showMessageBox({ message: 'A new desktop version is available.', buttons: ['Download', 'Later'], defaultId: 0, cancelId: 1 });
  if (response === 0) void shell.openExternal(`${ORIGIN}/download`);
};

app.whenReady().then(() => {
  menu();
  allowCors(session.defaultSession, ORIGIN);
  open();
  update().catch(() => { /* the next start checks again */ });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) open(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
