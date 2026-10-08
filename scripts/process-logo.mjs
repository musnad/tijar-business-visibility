import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src =
  process.argv[2] ??
  "/Users/macbookpro/.cursor/projects/Users-macbookpro-Desktop-Tijar-app/assets/WhatsApp_Image_2026-10-06_at_5.49.04_AM-406c3aea-d02e-449b-9a97-882df7ff93.png";
const out = path.join(root, "public", "tijar-logo.png");

const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixels = new Uint8Array(data);
for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  // Remove near-white background; keep anti-aliased logo edges
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  // White / light gray background
  if (max > 240 && saturation < 18) {
    pixels[i + 3] = 0;
  } else if (max > 220 && saturation < 25) {
    const t = (max - 220) / 35;
    pixels[i + 3] = Math.round(Math.max(0, pixels[i + 3] * (1 - t)));
  }
}

await sharp(pixels, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .trim({ threshold: 10 })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(out);

const meta = await sharp(out).metadata();
console.log(`Wrote ${out} (${meta.width}x${meta.height})`);
