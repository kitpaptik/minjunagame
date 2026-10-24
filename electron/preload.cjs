/** Exposes a tiny, safe surface to the game so it can tell it is running inside the desktop app. */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
    isApp: true,
    platform: process.platform,
});
