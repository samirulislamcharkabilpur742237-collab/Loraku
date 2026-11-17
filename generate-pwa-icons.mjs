import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function sampleIcon(nx, ny, maskable) {
  // Background: deep botanical green #1B4332
  let r = 27, g = 67, b = 50, a = 255;

  if (!maskable) {
    // Rounded corners
    const rad = 0.22;
    const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - rad));
    const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - rad));
    if (dx * dx + dy * dy > rad * rad) {
      return [0, 0, 0, 0];
    }
  }

  // Scale coordinates into safe zone for maskable
  const scale = maskable ? 0.72 : 0.92;
  const x = (nx - 0.5) / scale + 0.5;
  const y = (ny - 0.5) / scale + 0.5;

  // Subtle warm beige inner ring
  const distFromBorder = Math.max(Math.abs(nx - 0.5), Math.abs(ny - 0.5));
  if (!maskable && distFromBorder > 0.42 && distFromBorder < 0.435) {
    r = 95; g = 128; b = 109;
  }

  // Leaf shape (upper left tilted ellipse cut)
  const lx = (x - 0.39) * Math.cos(-0.6) - (y - 0.34) * Math.sin(-0.6);
  const ly = (x - 0.39) * Math.sin(-0.6) + (y - 0.34) * Math.cos(-0.6);
  const inLeaf = (lx / 0.085) ** 2 + (ly / 0.175) ** 2 <= 1;

  // Almond / Dry Fruit shape (center-right organic almond)
  const ax = (x - 0.54) * Math.cos(0.45) - (y - 0.56) * Math.sin(0.45);
  const ay = (x - 0.54) * Math.sin(0.45) + (y - 0.56) * Math.cos(0.45);
  const taper = 1 - 0.22 * ay;
  const inAlmond = (ax / (0.17 * taper)) ** 2 + (ay / 0.25) ** 2 <= 1;

  if (inLeaf) {
    r = 116; g = 198; b = 157; // #74C69D fresh leaf green
    if (Math.abs(lx) < 0.008 && Math.abs(ly) < 0.14) {
      r = 27; g = 67; b = 50;
    }
  }

  if (inAlmond) {
    r = 233; g = 222; b = 201; // #E9DEC9 warm almond beige
    // Subtle organic grain lines on almond
    if ((Math.abs(ax - 0.04) < 0.009 || Math.abs(ax + 0.05) < 0.008) && Math.abs(ay) < 0.15) {
      r = 176; g = 160; b = 132;
    }
  }

  return [r, g, b, a];
}

function renderPNG(size, maskable, outPath) {
  const buf = Buffer.alloc(size * size * 4);
  const ss = 2; // 2x2 supersampling for crisp edges
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const nx = (px + (sx + 0.5) / ss) / size;
          const ny = (py + (sy + 0.5) / ss) / size;
          const [sr, sg, sb, sa] = sampleIcon(nx, ny, maskable);
          r += sr; g += sg; b += sb; a += sa;
        }
      }
      const idx = (py * size + px) * 4;
      const samples = ss * ss;
      buf[idx] = Math.round(r / samples);
      buf[idx + 1] = Math.round(g / samples);
      buf[idx + 2] = Math.round(b / samples);
      buf[idx + 3] = Math.round(a / samples);
    }
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, encodePNG(size, size, buf));
}

renderPNG(192, false, 'public/pwa-192x192.png');
renderPNG(512, false, 'public/pwa-512x512.png');
renderPNG(512, true, 'public/pwa-maskable-512x512.png');
renderPNG(180, false, 'public/apple-touch-icon.png');
console.log('Generated all PWA PNG icons successfully.');
