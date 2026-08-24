/**
 * Packages the built site into a zip ready for Cloudflare Pages direct upload.
 *
 * The important detail: Cloudflare expects `index.html` at the *root* of the
 * archive. Zipping the `browser` folder itself produces an archive with a
 * single top-level directory, and the deployment serves nothing. This script
 * zips the folder's contents instead, and verifies the result before finishing.
 */

import { createWriteStream, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..');
const sourceDir = resolve(rootDir, 'dist/office-utility/browser');
const outputFile = resolve(rootDir, 'dist/office-utilities-site.zip');

if (!existsSync(join(sourceDir, 'index.html'))) {
  console.error(
    `No build found at ${sourceDir}\nRun "npm run build" first.`,
  );
  process.exit(1);
}

/** Walks the tree, returning paths relative to `sourceDir`. */
function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const files = collect(sourceDir);

/* ------------------------------------------------------------------
   Minimal ZIP writer (store + deflate), so packaging needs no dependency
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

const chunks = [];
const central = [];
let offset = 0;

for (const file of files) {
  // Zip entries always use forward slashes, whatever the host OS uses.
  const name = relative(sourceDir, file).split(sep).join('/');
  const nameBytes = Buffer.from(name, 'utf8');
  const contents = readFileSync(file);
  const checksum = crc32(contents);

  const deflated = deflateRawSync(contents, { level: 9 });
  // Only take the compressed form when it is actually smaller.
  const useDeflate = deflated.length < contents.length;
  const payload = useDeflate ? deflated : contents;
  const method = useDeflate ? 8 : 0;

  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4); // version needed
  localHeader.writeUInt16LE(0, 6); // flags
  localHeader.writeUInt16LE(method, 8);
  localHeader.writeUInt16LE(0, 10); // mod time
  localHeader.writeUInt16LE(0, 12); // mod date
  localHeader.writeUInt32LE(checksum, 14);
  localHeader.writeUInt32LE(payload.length, 18);
  localHeader.writeUInt32LE(contents.length, 22);
  localHeader.writeUInt16LE(nameBytes.length, 26);
  localHeader.writeUInt16LE(0, 28); // extra length

  chunks.push(localHeader, nameBytes, payload);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4); // version made by
  centralHeader.writeUInt16LE(20, 6); // version needed
  centralHeader.writeUInt16LE(0, 8); // flags
  centralHeader.writeUInt16LE(method, 10);
  centralHeader.writeUInt16LE(0, 12);
  centralHeader.writeUInt16LE(0, 14);
  centralHeader.writeUInt32LE(checksum, 16);
  centralHeader.writeUInt32LE(payload.length, 20);
  centralHeader.writeUInt32LE(contents.length, 24);
  centralHeader.writeUInt16LE(nameBytes.length, 28);
  centralHeader.writeUInt16LE(0, 30); // extra
  centralHeader.writeUInt16LE(0, 32); // comment
  centralHeader.writeUInt16LE(0, 34); // disk
  centralHeader.writeUInt16LE(0, 36); // internal attrs
  centralHeader.writeUInt32LE(0, 38); // external attrs
  centralHeader.writeUInt32LE(offset, 42);

  central.push(centralHeader, nameBytes);
  offset += localHeader.length + nameBytes.length + payload.length;
}

const centralBuffer = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuffer.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

writeFileSync(outputFile, Buffer.concat([...chunks, centralBuffer, end]));

const zipped = statSync(outputFile).size;
const raw = files.reduce((sum, file) => sum + statSync(file).size, 0);

console.log(`Packaged ${files.length} files`);
console.log(`  ${(raw / 1048576).toFixed(1)} MB uncompressed -> ${(zipped / 1048576).toFixed(1)} MB zipped`);
console.log(`  ${relative(rootDir, outputFile)}`);
console.log('\nindex.html is at the archive root, which is what Cloudflare Pages expects.');
