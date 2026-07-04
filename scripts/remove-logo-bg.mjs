/**
 * Removes the solid black background from logo-color.png
 * making every near-black pixel fully transparent.
 */
import sharp from "sharp";
import { resolve } from "path";

const INPUT  = resolve("public/logos/logo-color.png");
const TEMP   = resolve("public/logos/logo-color-tmp.png");
const OUTPUT = resolve("public/logos/logo-color.png");

const { data, info } = await sharp(INPUT)
  .ensureAlpha()        // make sure there's an alpha channel
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info; // channels === 4 (RGBA)

for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  // Threshold: treat any pixel darker than this as "background black"
  // The logo has a pure #000000 background, so threshold of 25 is safe
  if (r < 25 && g < 25 && b < 25) {
    data[i + 3] = 0; // alpha → transparent
  }
}

await sharp(Buffer.from(data), {
  raw: { width, height, channels },
})
  .png({ compressionLevel: 9 })
  .toFile(TEMP);

// Replace original with the transparency-fixed version
import { rename } from "fs/promises";
await rename(TEMP, OUTPUT);

console.log(`✓ Background removed → ${OUTPUT}`);
