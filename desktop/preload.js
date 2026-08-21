const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("homeStitchDesktop", {
  isDesktop: true,
  listPrinters: () => ipcRenderer.invoke("pos:listPrinters"),
  printRaw: (payloadBase64, printerName) => ipcRenderer.invoke("pos:printRaw", payloadBase64, printerName),
});
