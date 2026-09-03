/**
 * Renders the app icon to every raster size the site needs.
 *
 * The project ships `public/favicon.svg`, but a browser asking for
 * `/favicon.ico` — which Google's favicon crawler does — gets whatever ICO sits
 * at the web root. That file was still the one `ng new` generated, so search
 * results and shared links showed the Angular logo.
 *
 * No raster library is available, and adding one purely to draw a rounded
 * rectangle and nine line segments is not worth the dependency, so the mark is
 * rasterised here and encoded by hand. Geometry is kept identical to
 * favicon.svg so the vector and raster icons cannot drift apart.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(rootDir, 'public');

/* ------------------------------------------------------------------
   The mark, in the same 32-unit space as favicon.svg
   ------------------------------------------------------------------ */

const VIEW = 32;
const CORNER = 7;
const STROKE = 2;

const GRADIENT_FROM = [0x5b, 0x5b, 0xd6];
const GRADIENT_TO = [0x12, 0xb5, 0xc9];

/** The cube outline plus its three spokes, as flat segments. */
const SEGMENTS = [
  [6, 10.5, 16, 5],
  [16, 5, 26, 10.5],
  [26, 10.5, 26, 21.5],
  [26, 21.5, 16, 27],
  [16, 27, 6, 21.5],
  [6, 21.5, 6, 10.5],
  [16, 16, 6, 10.5],
  [16, 16, 26, 10.5],
  [16, 16, 16, 27],
];

function distanceToSegment(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Rounded-rectangle test in the 32-unit space. Radius 0 gives a full bleed. */
function insidePlate(x, y, radius) {
  const half = VIEW / 2;
  const dx = Math.max(Math.abs(x - half) - (half - radius), 0);
  const dy = Math.max(Math.abs(y - half) - (half - radius), 0);
  return Math.hypot(dx, dy) <= radius || (dx === 0 && dy === 0);
}

/**
 * Renders one square icon as RGBA bytes.
 *
 * Supersampled rather than analytically anti-aliased: at these sizes the extra
 * samples cost milliseconds and the edge quality is indistinguishable.
 */
function render(size, radius) {
  const samples = size >= 192 ? 4 : 8;
  const out = Buffer.alloc(size * size * 4);
  const strokeRadius = STROKE / 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Accumulate premultiplied, so transparent edges do not fringe dark.
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = ((px + (sx + 0.5) / samples) / size) * VIEW;
          const y = ((py + (sy + 0.5) / samples) / size) * VIEW;
          if (!insidePlate(x, y, radius)) continue;

          let onStroke = false;
          for (const segment of SEGMENTS) {
            if (distanceToSegment(x, y, segment) <= strokeRadius) {
              onStroke = true;
              break;
            }
          }

          if (onStroke) {
            r += 255;
            g += 255;
            b += 255;
          } else {
            // favicon.svg's gradient runs corner to corner.
            const t = Math.min(1, Math.max(0, (x + y) / (VIEW * 2)));
            r += GRADIENT_FROM[0] + (GRADIENT_TO[0] - GRADIENT_FROM[0]) * t;
            g += GRADIENT_FROM[1] + (GRADIENT_TO[1] - GRADIENT_FROM[1]) * t;
            b += GRADIENT_FROM[2] + (GRADIENT_TO[2] - GRADIENT_FROM[2]) * t;
          }
          a += 1;
        }
      }

      const total = samples * samples;
      const offset = (py * size + px) * 4;
      if (a === 0) continue;
      out[offset] = Math.round(r / a);
      out[offset + 1] = Math.round(g / a);
      out[offset + 2] = Math.round(b / a);
      out[offset + 3] = Math.round((a / total) * 255);
    }
  }
  return out;
}

/* ------------------------------------------------------------------
   PNG encoding
   ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  // Filter byte 0 (none) in front of every scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------
   ICO encoding (32-bit BMP entries, the widely-compatible form)
   ------------------------------------------------------------------ */

function bmpEntry(size, rgba) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8); // XOR image plus AND mask
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);

  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    // BMP rows run bottom-up, and channels are BGRA.
    const source = (size - 1 - y) * size * 4;
    for (let x = 0; x < size; x++) {
      const s = source + x * 4;
      const d = (y * size + x) * 4;
      xor[d] = rgba[s + 2];
      xor[d + 1] = rgba[s + 1];
      xor[d + 2] = rgba[s];
      xor[d + 3] = rgba[s + 3];
    }
  }

  // Alpha in the XOR data carries transparency, so the mask stays clear.
  const maskRow = Math.ceil(size / 8);
  const padded = Math.ceil(maskRow / 4) * 4;
  const and = Buffer.alloc(padded * size);

  return Buffer.concat([header, xor, and]);
}

function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = [];
  const bodies = [];
  let offset = 6 + images.length * 16;

  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    directory.push(entry);
    bodies.push(data);
    offset += data.length;
  }

  return Buffer.concat([header, ...directory, ...bodies]);
}

/* ------------------------------------------------------------------
   Emit
   ------------------------------------------------------------------ */

const PNG_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICO_SIZES = [16, 32, 48];

mkdirSync(join(publicDir, 'icons'), { recursive: true });

for (const size of PNG_SIZES) {
  // Full bleed: these are declared `maskable`, so the platform applies its own
  // shape and any corner rounding baked in here would be cropped anyway. The
  // mark occupies the middle 62% of the square, well inside the safe zone.
  const png = encodePng(size, render(size, 0));
  const file = join(publicDir, 'icons', `icon-${size}x${size}.png`);
  writeFileSync(file, png);
  console.log(`  ${relative(rootDir, file)}  ${png.length} bytes`);
}

const ico = encodeIco(
  ICO_SIZES.map((size) => ({ size, data: bmpEntry(size, render(size, CORNER)) })),
);
writeFileSync(join(publicDir, 'favicon.ico'), ico);
console.log(`  ${relative(rootDir, join(publicDir, 'favicon.ico'))}  ${ico.length} bytes`);

console.log(`\n${PNG_SIZES.length} PNG icons and 1 ICO written from the favicon.svg geometry.`);
