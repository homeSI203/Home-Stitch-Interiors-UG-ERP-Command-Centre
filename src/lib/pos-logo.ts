/** Load company logo and encode as ESC/POS raster bitmap for thermal printers. */

import {
  THERMAL_LOGO_MAX_HEIGHT_DOTS,
  THERMAL_LOGO_MAX_WIDTH_DOTS,
} from "@/lib/thermal-receipt";

export function companyLogoUrl(logoUrl?: string | null): string {
  return logoUrl?.trim() || "/logos/logo-color.png";
}

function resolveLogoSrc(logoUrl: string): string {
  if (typeof window === "undefined") return logoUrl;
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) return logoUrl;
  if (logoUrl.startsWith("/")) return `${window.location.origin}${logoUrl}`;
  return logoUrl;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load logo: ${src}`));
    img.src = src;
  });
}

function scaleDimensions(w: number, h: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / w, maxH / h, 1);
  const width = Math.max(8, Math.floor((w * ratio) / 8) * 8);
  const height = Math.max(1, Math.floor(h * ratio));
  return { width, height };
}

function imageDataToEscPosRaster(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const bytesPerRow = width / 8;
  const raster = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const isDark = a > 64 && lum < 200;

      if (isDark) {
        const byteIndex = y * bytesPerRow + Math.floor(x / 8);
        raster[byteIndex] |= 1 << (7 - (x % 8));
      }
    }
  }

  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;

  const header = new Uint8Array([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
  const out = new Uint8Array(header.length + raster.length);
  out.set(header);
  out.set(raster, header.length);
  return out;
}

/** Logo left + company name right; address & phones tucked below (thermal ESC/POS). */
export async function loadThermalHeaderRaster(
  company: {
    name?: string;
    tagline?: string;
    logoUrl?: string | null;
    address?: string;
    phone?: string;
    phoneSecondary?: string;
  }
): Promise<Uint8Array | null> {
  if (typeof document === "undefined") return null;

  const canvasWidth = THERMAL_LOGO_MAX_WIDTH_DOTS;
  const src = resolveLogoSrc(companyLogoUrl(company.logoUrl));
  const address = company.address || "Busega Round about, Kampala, Uganda";
  const phones = [company.phone, company.phoneSecondary]
    .filter((p): p is string => typeof p === "string" && p.length > 0 && !/700.?000.?000/.test(p))
    .join(" / ") || "+256 757 148631 / +256 754 604928";

  try {
    const img = await loadImage(src);
    const logoMaxH = 80;
    const logoMaxW = Math.floor(canvasWidth * 0.58);
    const { width: logoW, height: logoH } = scaleDimensions(img.width, img.height, logoMaxW, logoMaxH);

    const logoRowH = Math.max(logoH, 52);
    const measure = document.createElement("canvas");
    measure.width = canvasWidth;
    const mctx = measure.getContext("2d");
    if (!mctx) return null;

    const contactFont = "7px monospace";
    const contactLineH = 8;
    mctx.font = contactFont;
    const addressLines = wrapTextLines(mctx, address, canvasWidth - 4);
    const phoneLines = wrapTextLines(mctx, phones, canvasWidth - 4);
    const canvasHeight = logoRowH + 3 + addressLines.length * contactLineH + phoneLines.length * contactLineH + 2;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const logoY = Math.floor((logoRowH - logoH) / 2);
    ctx.drawImage(img, 2, logoY, logoW, logoH);

    const textX = logoW + 8;
    const textMaxW = canvasWidth - textX - 2;
    const name = (company.name || "HOME STITCH INTERIORS UG").toUpperCase();

    ctx.fillStyle = "#000000";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.font = "bold 11px monospace";
    wrapCanvasText(ctx, name, textX, logoY + 2, textMaxW, 11);

    if (company.tagline) {
      ctx.font = "8px monospace";
      ctx.fillStyle = "#444444";
      wrapCanvasText(ctx, company.tagline, textX, logoY + 16, textMaxW, 9);
    }

    let y = logoRowH + 2;
    ctx.textAlign = "center";
    ctx.fillStyle = "#333333";
    ctx.font = contactFont;
    for (const row of addressLines) {
      ctx.fillText(row, canvasWidth / 2, y);
      y += contactLineH;
    }
    for (const row of phoneLines) {
      ctx.fillText(row, canvasWidth / 2, y);
      y += contactLineH;
    }

    const rasterWidth = Math.max(8, Math.floor(canvasWidth / 8) * 8);
    const rasterHeight = Math.max(8, Math.ceil(canvasHeight / 8) * 8);
    const outCanvas = document.createElement("canvas");
    outCanvas.width = rasterWidth;
    outCanvas.height = rasterHeight;
    const octx = outCanvas.getContext("2d");
    if (!octx) return null;
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, rasterWidth, rasterHeight);
    octx.drawImage(canvas, 0, 0);

    return imageDataToEscPosRaster(octx.getImageData(0, 0, rasterWidth, rasterHeight));
  } catch {
    if (!src.includes("/logos/logo-color.png")) {
      return loadThermalHeaderRaster({ ...company, logoUrl: "/logos/logo-color.png" });
    }
    return loadLogoRaster(company.logoUrl);
  }
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/);
  let line = "";
  let offsetY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x + maxWidth, offsetY);
      line = word;
      offsetY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x + maxWidth, offsetY);
}

/** Returns ESC/POS raster bytes, or null if the logo cannot be loaded. */
export async function loadLogoRaster(logoUrl?: string | null): Promise<Uint8Array | null> {
  if (typeof document === "undefined") return null;

  const src = resolveLogoSrc(companyLogoUrl(logoUrl));
  try {
    const img = await loadImage(src);
    const { width, height } = scaleDimensions(
      img.width,
      img.height,
      THERMAL_LOGO_MAX_WIDTH_DOTS,
      THERMAL_LOGO_MAX_HEIGHT_DOTS
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return imageDataToEscPosRaster(ctx.getImageData(0, 0, width, height));
  } catch {
    if (!src.includes("/logos/logo-color.png")) {
      return loadLogoRaster("/logos/logo-color.png");
    }
    return null;
  }
}
