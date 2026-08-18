"use client";

type SerialPortLike = {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open: (opts: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
};

type SerialNavigator = Navigator & {
  serial: {
    requestPort: (opts?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }) => Promise<SerialPortLike>;
    getPorts: () => Promise<SerialPortLike[]>;
    addEventListener: (type: "connect" | "disconnect", listener: (ev: Event) => void) => void;
    removeEventListener: (type: "connect" | "disconnect", listener: (ev: Event) => void) => void;
  };
};

type SavedPrinter = {
  usbVendorId?: number;
  usbProductId?: number;
  baudRate: number;
};

const STORAGE_KEY = "hsi.pos.thermalPrinter";
const BAUDS = [9600, 115200, 19200, 38400, 57600];

let port: SerialPortLike | null = null;
let savedBaud = 9600;

function serialApi() {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as SerialNavigator;
  return "serial" in nav ? nav.serial : null;
}

function loadSaved(): SavedPrinter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPrinter;
    if (!parsed || typeof parsed.baudRate !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistPrinter(next: SerialPortLike, baudRate: number) {
  savedBaud = baudRate;
  const info = next.getInfo?.() ?? {};
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      usbVendorId: info.usbVendorId,
      usbProductId: info.usbProductId,
      baudRate,
    } satisfies SavedPrinter)
  );
}

function pickSavedPort(ports: SerialPortLike[], saved: SavedPrinter | null) {
  if (!saved?.usbVendorId) return ports[0] ?? null;
  return (
    ports.find((p) => {
      const info = p.getInfo?.() ?? {};
      return info.usbVendorId === saved.usbVendorId && info.usbProductId === saved.usbProductId;
    }) ?? ports[0] ?? null
  );
}

export function isPosPrinterSupported() {
  return serialApi() !== null;
}

export function isPosPrinterConnected() {
  return !!(port && port.writable);
}

export function hasSavedPosPrinter() {
  return loadSaved() !== null;
}

export function explainPrinterError(err: unknown): string {
  const name = typeof err === "object" && err && "name" in err ? String((err as { name: string }).name) : "";
  const msg = err instanceof Error ? err.message : String(err);
  if (!serialApi()) {
    return "This browser cannot drive the thermal printer. Open POS in Chrome or Edge.";
  }
  if (name === "NotFoundError" || /No port selected|cancelled/i.test(msg)) {
    return "No thermal printer was selected.";
  }
  if (name === "NetworkError" || /disconnected|device has been lost/i.test(msg)) {
    return "Thermal printer disconnected. Check the USB cable and try again.";
  }
  if (name === "InvalidStateError" || /already open|in use/i.test(msg)) {
    return "Thermal printer is busy or already in use by another program.";
  }
  if (/not connected|No thermal printer selected/i.test(msg)) {
    return msg;
  }
  return msg || "Thermal printer failed.";
}

async function openPort(next: SerialPortLike, baudRate: number) {
  try {
    await next.open({ baudRate });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already open|InvalidStateError/i.test(msg) && (err as { name?: string }).name !== "InvalidStateError") {
      throw err;
    }
  }
  port = next;
  persistPrinter(next, baudRate);
}

async function openWithSavedBaud(next: SerialPortLike) {
  const saved = loadSaved();
  const bauds = [saved?.baudRate ?? savedBaud, ...BAUDS].filter(
    (rate, index, all) => all.indexOf(rate) === index
  );
  let lastError: unknown;
  for (const baud of bauds) {
    try {
      await openPort(next, baud);
      return true;
    } catch (err) {
      lastError = err;
      try {
        await next.close();
      } catch {
        /* still trying the next baud */
      }
      port = null;
    }
  }
  if (lastError) throw lastError;
  return false;
}

export async function reconnectPosPrinter() {
  const serial = serialApi();
  if (!serial) return false;
  if (isPosPrinterConnected()) return true;
  const ports = await serial.getPorts();
  if (!ports.length) return false;
  const candidate = pickSavedPort(ports, loadSaved());
  if (!candidate) return false;
  try {
    await openWithSavedBaud(candidate);
    return isPosPrinterConnected();
  } catch {
    return false;
  }
}

export async function connectPosPrinter() {
  const serial = serialApi();
  if (!serial) {
    throw new Error("Use Chrome or Edge on this POS PC to talk to the thermal printer.");
  }
  try {
    const selected = await serial.requestPort();
    if (port && port !== selected) {
      try {
        await port.close();
      } catch {
        /* replace with the newly chosen printer */
      }
      port = null;
    }
    await openWithSavedBaud(selected);
  } catch (err) {
    throw new Error(explainPrinterError(err));
  }
  return true;
}

export async function printPosRaw(bytes: Uint8Array) {
  if (!isPosPrinterConnected()) {
    const reused = await reconnectPosPrinter();
    if (!reused) {
      throw new Error(
        hasSavedPosPrinter()
          ? "Saved thermal printer is not connected. Plug it in and try again."
          : "No thermal printer selected. Open Printer settings and choose the till printer."
      );
    }
  }
  if (!port?.writable) {
    throw new Error("Thermal printer is not connected.");
  }
  const writer = port.writable.getWriter();
  try {
    await writer.write(bytes);
  } catch (err) {
    port = null;
    throw new Error(explainPrinterError(err));
  } finally {
    writer.releaseLock();
  }
}

export function subscribePosPrinter(onChange: (connected: boolean) => void) {
  const serial = serialApi();
  if (!serial) {
    onChange(false);
    return () => undefined;
  }

  const sync = () => onChange(isPosPrinterConnected());

  const onConnect = () => {
    void reconnectPosPrinter().then((ok) => onChange(ok || isPosPrinterConnected()));
  };
  const onDisconnect = () => {
    port = null;
    onChange(false);
  };

  serial.addEventListener("connect", onConnect);
  serial.addEventListener("disconnect", onDisconnect);
  void reconnectPosPrinter().then((ok) => onChange(ok || isPosPrinterConnected()));

  return () => {
    serial.removeEventListener("connect", onConnect);
    serial.removeEventListener("disconnect", onDisconnect);
    sync();
  };
}
