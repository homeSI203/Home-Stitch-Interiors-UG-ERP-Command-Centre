/** Shared 58mm thermal receipt dimensions (POS ESC/POS + browser print). */

/** Standard till roll width */
export const THERMAL_PAPER_MM = 58;

/** @page margin used in browser print */
export const THERMAL_MARGIN_MM = 2;

/** Printable content width inside margins */
export const THERMAL_CONTENT_MM = THERMAL_PAPER_MM - THERMAL_MARGIN_MM * 2;

/** ESC/POS character columns on 58mm paper (Font A) */
export const THERMAL_ESC_COLS = 32;

/** Raster logo max width in dots (~48mm @ 203dpi) */
export const THERMAL_LOGO_MAX_WIDTH_DOTS = 256;

export const THERMAL_LOGO_MAX_HEIGHT_DOTS = 96;

/** Base monospace size for thermal HTML + print */
export const THERMAL_BASE_FONT_PX = 10;

/** Tailwind classes for on-screen thermal receipt preview */
export const THERMAL_RECEIPT_CLASSES =
  "thermal-receipt bg-white font-mono text-[10px] leading-snug mx-auto p-3 border border-dashed border-gray-300 shadow-sm";

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
