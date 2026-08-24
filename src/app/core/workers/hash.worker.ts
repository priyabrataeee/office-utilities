/// <reference lib="webworker" />

/**
 * Streaming file hashing, off the main thread.
 *
 * Web Crypto's `digest` needs the whole buffer at once, which rules out
 * multi-gigabyte files. SHA-256 is therefore implemented here over a chunked
 * stream; CRC32 is a simple table-driven pass. Both report progress so the UI
 * can show something honest on a large file.
 */

export type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512' | 'CRC32';

export interface HashRequest {
  readonly id: number;
  readonly file: File;
  readonly algorithms: readonly HashAlgorithm[];
}

export type HashResponse =
  | { readonly id: number; readonly type: 'progress'; readonly loaded: number; readonly total: number }
  | {
      readonly id: number;
      readonly type: 'done';
      readonly results: Record<string, string>;
      readonly bytes: number;
      readonly milliseconds: number;
    }
  | { readonly id: number; readonly type: 'error'; readonly message: string };

const CHUNK_SIZE = 8 * 1024 * 1024;

addEventListener('message', (event: MessageEvent<HashRequest>) => {
  const request = event.data;
  void run(request).catch((error: unknown) => {
    post({
      id: request.id,
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  });
});

function post(message: HashResponse): void {
  postMessage(message);
}

async function run(request: HashRequest): Promise<void> {
  const started = performance.now();
  const { file, algorithms } = request;

  const wantsSha256 = algorithms.includes('SHA-256');
  const wantsCrc = algorithms.includes('CRC32');
  const wide = algorithms.filter(
    (name): name is 'SHA-384' | 'SHA-512' => name === 'SHA-384' || name === 'SHA-512',
  );

  const results: Record<string, string> = {};

  // SHA-256 and CRC32 stream, so they work on files far larger than memory.
  if (wantsSha256 || wantsCrc) {
    const sha256 = wantsSha256 ? createSha256() : null;
    let crc = 0xffffffff;
    let loaded = 0;

    for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
      const chunk = new Uint8Array(
        await file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size)).arrayBuffer(),
      );
      sha256?.update(chunk);
      if (wantsCrc) crc = crc32Update(crc, chunk);

      loaded += chunk.length;
      post({ id: request.id, type: 'progress', loaded, total: file.size });
    }

    if (sha256) results['SHA-256'] = sha256.digest();
    if (wantsCrc) results['CRC32'] = ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
  }

  // SHA-384/512 need 64-bit arithmetic, so they use Web Crypto — which wants
  // the whole file at once. The UI warns before offering these on large files.
  if (wide.length) {
    const buffer = await file.arrayBuffer();
    for (const algorithm of wide) {
      const digest = await crypto.subtle.digest(algorithm, buffer);
      results[algorithm] = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    }
    post({ id: request.id, type: 'progress', loaded: file.size, total: file.size });
  }

  post({
    id: request.id,
    type: 'done',
    results,
    bytes: file.size,
    milliseconds: performance.now() - started,
  });
}

/* ------------------------------------------------------------------
   SHA-2 family
   ------------------------------------------------------------------ */

interface ShaState {
  update(chunk: Uint8Array): void;
  digest(): string;
}

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function createSha256(): ShaState {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  let buffer = new Uint8Array(0);
  let length = 0;

  const compress = (block: Uint8Array, offset: number): void => {
    for (let i = 0; i < 16; i++) {
      w[i] =
        (block[offset + i * 4] << 24) |
        (block[offset + i * 4 + 1] << 16) |
        (block[offset + i * 4 + 2] << 8) |
        block[offset + i * 4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K256[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + hh) | 0;
  };

  return {
    update(chunk) {
      length += chunk.length;
      const combined = concat(buffer, chunk);
      const blocks = Math.floor(combined.length / 64);
      for (let i = 0; i < blocks; i++) compress(combined, i * 64);
      buffer = combined.slice(blocks * 64);
    },
    digest() {
      const bitLength = length * 8;
      const padded = new Uint8Array(buffer.length + 72);
      padded.set(buffer);
      padded[buffer.length] = 0x80;

      const blockCount = Math.ceil((buffer.length + 9) / 64);
      const total = blockCount * 64;
      const view = new DataView(padded.buffer);
      // Length is 64-bit big-endian; files above 2^53 bits are not a concern.
      view.setUint32(total - 8, Math.floor(bitLength / 0x100000000));
      view.setUint32(total - 4, bitLength >>> 0);

      for (let i = 0; i < blockCount; i++) compress(padded, i * 64);
      return Array.from(h)
        .map((value) => (value >>> 0).toString(16).padStart(8, '0'))
        .join('');
    },
  };
}

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/* ------------------------------------------------------------------
   CRC32
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

function crc32Update(crc: number, chunk: Uint8Array): number {
  let value = crc;
  for (const byte of chunk) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return value >>> 0;
}
