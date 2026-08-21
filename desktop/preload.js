const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("homeStitchDesktop", {
  isDesktop: true,
  listPrinters: () => ipcRenderer.invoke("pos:listPrinters"),
  printRaw: (payloadBase64, printerName) => ipcRenderer.invoke("pos:printRaw", payloadBase64, printerName),
  savePdf: (payload) => ipcRenderer.invoke("docs:savePdf", payload),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("app:updateStatus", listener);
    return () => ipcRenderer.removeListener("app:updateStatus", listener);
  },
});
