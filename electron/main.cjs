/**
 * Electron entry point: wraps the Phaser game in a desktop window.
 *
 * Files are served through a custom app:// protocol instead of file:// because
 * Chromium blocks ES module imports from file:// pages.
 */
const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');

protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serveProjectFiles() {
    protocol.handle('app', (request) => {
        const { pathname } = new URL(request.url);
        const filePath = path.resolve(ROOT, `.${decodeURIComponent(pathname)}`);
        // Never serve anything outside the project folder.
        if (!filePath.startsWith(ROOT + path.sep)) {
            return new Response('Forbidden', { status: 403 });
        }
        return net.fetch(pathToFileURL(filePath).toString());
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        useContentSize: true,
        minWidth: 640,
        minHeight: 360,
        backgroundColor: '#111111',
        autoHideMenuBar: true,
        title: 'MINJOON',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // F11 toggles fullscreen on every platform.
    win.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'F11') {
            win.setFullScreen(!win.isFullScreen());
            event.preventDefault();
        }
    });

    win.loadURL('app://game/index.html');
}

app.whenReady().then(() => {
    serveProjectFiles();
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
