/* What the page learns of the shell: that it is in one, and on which system. */
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('omnistaxDesktop', { platform: process.platform });
