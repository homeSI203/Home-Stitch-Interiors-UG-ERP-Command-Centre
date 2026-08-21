const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const SKIP_PRINTERS = /print to pdf|xps document|onenote|fax|microsoft ipp/i;
const PACKAGED_PORT = 47321;

let mainWindow = null;
let nextProcess = null;

function appIcon() {
  const packaged = path.join(process.resourcesPath, "icon.png");
  const local = path.join(__dirname, "icon.png");
  if (app.isPackaged && fs.existsSync(packaged)) return packaged;
  if (fs.existsSync(local)) return local;
  return undefined;
}

function resourcePath(...parts) {
  if (app.isPackaged) return path.join(process.resourcesPath, ...parts);
  return path.join(__dirname, ...parts);
}

function projectRoot() {
  return app.isPackaged ? resourcePath("next") : path.join(__dirname, "..");
}

function printScript() {
  return resourcePath("print-raw.ps1");
}

function waitForUrl(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(url);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Home Stitch ERP did not start in time."));
          return;
        }
        setTimeout(attempt, 400);
      });
    };
    attempt();
  });
}

function runPowerShell(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", ...args], {
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || stdout.trim() || `PowerShell exited ${code}`));
    });
  });
}

async function startPackagedServer() {
  const nextDir = projectRoot();
  const serverJs = path.join(nextDir, "server.js");
  if (!fs.existsSync(serverJs)) {
    throw new Error("Packaged ERP server is missing. Rebuild the Windows app.");
  }
  const url = `http://127.0.0.1:${PACKAGED_PORT}`;
  nextProcess = spawn(process.execPath, [serverJs], {
    cwd: nextDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(PACKAGED_PORT),
      HOSTNAME: "127.0.0.1",
    },
    windowsHide: true,
    stdio: "pipe",
  });
  nextProcess.on("error", (err) => {
    console.error(err);
  });
  await waitForUrl(url, 120000);
  return url;
}

async function startDevServer() {
  const url = "http://127.0.0.1:3000";
  try {
    await waitForUrl(url, 1500);
    return url;
  } catch {
    /* start Next for this session */
  }
  const yarnCmd = process.platform === "win32" ? "yarn.cmd" : "yarn";
  nextProcess = spawn(yarnCmd, ["dev"], {
    cwd: projectRoot(),
    env: process.env,
    shell: true,
    windowsHide: true,
    stdio: "pipe",
  });
  await waitForUrl(url, 180000);
  return url;
}

function createWindow() {
  const icon = appIcon();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    center: true,
    title: "Home Stitch ERP Command Centre",
    backgroundColor: "#1F3D2B",
    icon,
    autoHideMenuBar: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow) return;
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
    mainWindow?.setTitle("Home Stitch ERP Command Centre");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function listPrinters() {
  const electronPrinters = mainWindow ? await mainWindow.webContents.getPrintersAsync() : [];
  const ports = {};
  try {
    const raw = await runPowerShell([
      "-Command",
      "Get-CimInstance Win32_Printer | Select-Object Name, PortName | ConvertTo-Json -Compress",
    ]);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      for (const row of rows) {
        if (row?.Name) ports[String(row.Name)] = String(row.PortName || "");
      }
    }
  } catch {
    /* names from Electron are enough */
  }

  return electronPrinters
    .filter((printer) => !SKIP_PRINTERS.test(`${printer.name} ${printer.displayName || ""}`))
    .map((printer) => ({
      name: printer.name,
      displayName: printer.displayName || printer.name,
      isDefault: Boolean(printer.isDefault),
      port: ports[printer.name] || "",
    }))
    .sort((a, b) => {
      const score = (item) => (/USB|DOT4/i.test(item.port) ? 0 : /COM/i.test(item.port) ? 2 : 1);
      return score(a) - score(b) || a.name.localeCompare(b.name);
    });
}

function printRaw(payloadBase64, printerName) {
  if (!printerName) {
    return Promise.reject(new Error("No USB printer selected."));
  }
  const tmp = path.join(os.tmpdir(), `hsi-receipt-${Date.now()}.bin`);
  fs.writeFileSync(tmp, Buffer.from(String(payloadBase64 || ""), "base64"));
  return runPowerShell(["-File", printScript(), "-Printer", printerName, "-File", tmp]).finally(() => {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* temp file */
    }
  });
}

function stopNext() {
  if (!nextProcess) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(nextProcess.pid), "/f", "/t"], { windowsHide: true });
    } else {
      nextProcess.kill();
    }
  } catch {
    /* shutting down */
  }
  nextProcess = null;
}

app.setName("Home Stitch ERP");
app.setAppUserModelId("ug.homestitch.erp");

app.whenReady().then(async () => {
  ipcMain.handle("pos:listPrinters", () => listPrinters());
  ipcMain.handle("pos:printRaw", (_event, payloadBase64, printerName) => printRaw(payloadBase64, printerName));
  createWindow();
  await mainWindow.loadFile(path.join(__dirname, "loading.html"));
  try {
    const url = app.isPackaged ? await startPackagedServer() : await startDevServer();
    await mainWindow.loadURL(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await mainWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        `<html><body style="font-family:Segoe UI;background:#1F3D2B;color:#F5E9DA;padding:48px;text-align:center"><h1>Home Stitch ERP</h1><p>${message}</p></body></html>`
      )}`
    );
    mainWindow.show();
  }
});

app.on("window-all-closed", () => {
  stopNext();
  app.quit();
});

app.on("before-quit", () => {
  stopNext();
});
