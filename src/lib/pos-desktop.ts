import { bytesToBase64 } from "@/lib/pos-print-jobs";

export type DesktopPrinter = {
  name: string;
  displayName: string;
  isDefault: boolean;
  port: string;
};

type DesktopBridge = {
  isDesktop: true;
  listPrinters: () => Promise<DesktopPrinter[]>;
  printRaw: (payloadBase64: string, printerName: string) => Promise<void>;
};

declare global {
  interface Window {
    homeStitchDesktop?: DesktopBridge;
  }
}

const STORAGE_KEY = "hsi.pos.windowsPrinter";

export function isDesktopPos() {
  return typeof window !== "undefined" && Boolean(window.homeStitchDesktop);
}

export function loadDesktopPrinterName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) || "";
}

export function saveDesktopPrinterName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, name);
  window.dispatchEvent(new Event("hsi-printer-changed"));
}

export async function listDesktopPrinters() {
  return window.homeStitchDesktop?.listPrinters() ?? [];
}

export async function printDesktopRaw(bytes: Uint8Array, printerName?: string) {
  const bridge = window.homeStitchDesktop;
  if (!bridge) {
    throw new Error("Not running inside the Windows ERP app.");
  }
  const name = printerName || loadDesktopPrinterName();
  if (!name) {
    throw new Error("Select a USB printer in Printer settings.");
  }
  await bridge.printRaw(bytesToBase64(bytes), name);
}
