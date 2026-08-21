import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const standalone = path.join(root, ".next", "standalone");
const server = path.join(standalone, "server.js");

if (!fs.existsSync(server)) {
  console.error("Missing .next/standalone/server.js. Run `yarn build` first.");
  process.exit(1);
}

function copyDir(from, to) {
  fs.cpSync(from, to, { recursive: true });
}

const publicDir = path.join(root, "public");
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, path.join(standalone, "public"));
}

copyDir(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
console.log("Standalone ERP is ready to package.");
