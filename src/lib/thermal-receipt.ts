/** Standard 80mm thermal roll — 80mm wide × 80mm diameter × 70gsm. */

/** Till-roll width (printable page width for browser + CSS) */
export const THERMAL_PAPER_MM = 80;

/** Roll outer diameter of the stock we print on */
export const THERMAL_ROLL_DIAMETER_MM = 80;

/** Paper weight */
export const THERMAL_PAPER_GSM = 70;

/** @page margin used in browser print */
export const THERMAL_MARGIN_MM = 4;

/** Printable content width inside margins */
export const THERMAL_CONTENT_MM = THERMAL_PAPER_MM - THERMAL_MARGIN_MM * 2;

/** ESC/POS Font A columns on 80mm paper at 203 dpi (576 dots / 12) */
export const THERMAL_ESC_COLS = 48;

/** Printable width in dots for GS W (80mm @ 203 dpi) */
export const THERMAL_ESC_DOTS = 576;

/** Raster logo / header max width in dots (multiple of 8) */
export const THERMAL_LOGO_MAX_WIDTH_DOTS = 576;

export const THERMAL_LOGO_MAX_HEIGHT_DOTS = 128;

/** Base monospace size for thermal HTML + print */
export const THERMAL_BASE_FONT_PX = 12;

/** Tailwind classes for on-screen thermal receipt preview */
export const THERMAL_RECEIPT_CLASSES =
  "thermal-receipt bg-white font-mono text-[12px] leading-snug mx-auto p-3 border border-dashed border-gray-300 shadow-sm";

export const THERMAL_RECEIPT_PRINT_CSS = `
.thermal-receipt {
  width: ${THERMAL_CONTENT_MM}mm;
  max-width: 100%;
  margin: 0 auto;
  padding: 0;
  font-family: ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', Consolas, monospace;
  font-size: ${THERMAL_BASE_FONT_PX}px;
  line-height: 1.375;
  color: #111;
  background: #fff;
}
`;
