// Generate the PWA icons from the app's sprout mark.
// Green (#1F4D32) rounded tile + white sprout glyph, with maskable-safe padding
// (the glyph sits inside the central ~50%, so Android adaptive masks never crop it).
// Run with: npm run gen:icons
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public");
mkdirSync(outDir, { recursive: true });

// lucide "Sprout" glyph (24x24), scaled 10.667x and centered in a 512 tile so it
// occupies the central 256px — comfortably inside the maskable safe zone.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#1F4D32"/>
  <g transform="translate(128,128) scale(10.6667)" fill="none" stroke="#EAF3E2"
     stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 20h10"/>
    <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
    <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
  </g>
</svg>`;

const svgBuf = Buffer.from(svg);

const targets = [
  { file: "icon-512.png", size: 512 },
  { file: "icon-192.png", size: 192 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(svgBuf).resize(size, size).png().toFile(path.join(outDir, file));
  console.log(`Wrote public/${file} (${size}x${size}).`);
}
