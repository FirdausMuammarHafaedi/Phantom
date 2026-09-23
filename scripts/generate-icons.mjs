import fs from 'fs';
import zlib from 'zlib';

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const checksum = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(checksum, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter byte none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const idatData = zlib.deflateSync(raw);
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', iend),
  ]);
}

// Persona 5 Icon Renderer
function renderP5Icon(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5;
  const cy = 0.5;
  const dx = nx - cx;
  const dy = ny - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background
  let r = 16, g = 17, b = 24, a = 255; // #101118 dark canvas

  // Red diagonal slash
  const slash = (nx * 0.7 + ny * 0.3);
  if (slash > 0.42 && slash < 0.58) {
    r = 230; g = 0; b = 18; // #e60012 Persona Red
  }

  // Inner diamond / card
  const diamond = Math.abs(dx) + Math.abs(dy);
  const diamondLimit = isMaskable ? 0.36 : 0.42;

  if (diamond < diamondLimit) {
    // Inside diamond
    r = 24; g = 25; b = 35;
    if (diamond > diamondLimit - 0.02) {
      r = 230; g = 0; b = 18; // border
    }
  }

  // Headphone band
  const headDist = Math.sqrt(dx * dx + (dy + 0.04) * (dy + 0.04));
  if (headDist > 0.17 && headDist < 0.22 && ny < 0.5) {
    r = 255; g = 255; b = 255;
  }

  // Ear cups
  if (Math.abs(dx) > 0.16 && Math.abs(dx) < 0.23 && Math.abs(dy + 0.02) < 0.08) {
    r = 230; g = 0; b = 18;
    if (Math.abs(dx) > 0.18 && Math.abs(dx) < 0.21 && Math.abs(dy + 0.02) < 0.05) {
      r = 255; g = 255; b = 255;
    }
  }

  // Phantom Mask Wing
  const maskY = ny - 0.52;
  const maskX = Math.abs(dx);
  if (maskX < 0.22 && maskY > -0.06 && maskY < 0.14) {
    const wingEdge = 0.22 - (maskY + 0.06) * 0.8;
    if (maskX < wingEdge) {
      r = 0; g = 0; b = 0; // Black mask body

      // Mask red accent
      if (maskX < wingEdge - 0.02 && maskY > -0.04 && maskY < 0.11) {
        r = 230; g = 0; b = 18;
      }

      // Eye cutout (white)
      if (maskX > 0.04 && maskX < 0.12 && maskY > -0.02 && maskY < 0.04) {
        r = 255; g = 255; b = 255;
      }

      // Center gold star
      if (Math.abs(dx) < 0.03 && Math.abs(maskY - 0.02) < 0.03) {
        r = 255; g = 215; b = 0; // #ffd700
      }
    }
  }

  // Soundwave bars below
  if (ny > 0.68 && ny < 0.76 && Math.abs(dx) < 0.18) {
    const barIndex = Math.floor((nx - 0.32) / 0.045);
    const inBar = ((nx - 0.32) % 0.045) < 0.025;
    if (inBar && barIndex >= 0 && barIndex < 8) {
      const barHeights = [0.03, 0.06, 0.04, 0.07, 0.05, 0.03, 0.06, 0.04];
      const hLimit = barHeights[barIndex];
      if (Math.abs(ny - 0.72) < hLimit) {
        r = barIndex % 2 === 0 ? 255 : 230;
        g = barIndex % 2 === 0 ? 255 : 0;
        b = barIndex % 2 === 0 ? 255 : 18;
      }
    }
  }

  // Border frame
  if (!isMaskable) {
    if (x < 6 || x >= w - 6 || y < 6 || y >= h - 6) {
      r = 230; g = 0; b = 18;
    }
  }

  return [r, g, b, a];
}

// Generate files
fs.writeFileSync('public/pwa-192x192.png', createPng(192, 192, (x, y, w, h) => renderP5Icon(x, y, w, h, false)));
fs.writeFileSync('public/pwa-512x512.png', createPng(512, 512, (x, y, w, h) => renderP5Icon(x, y, w, h, false)));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPng(512, 512, (x, y, w, h) => renderP5Icon(x, y, w, h, true)));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180, (x, y, w, h) => renderP5Icon(x, y, w, h, false)));
fs.writeFileSync('public/favicon.ico', createPng(32, 32, (x, y, w, h) => renderP5Icon(x, y, w, h, false)));

console.log('PWA icons successfully generated!');
