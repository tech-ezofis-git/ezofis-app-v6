// Writes a QR code as a plain PGM image for the scan test (test_flow21.py converts it to PNG with Pillow).
// usage: node make_qr.cjs "<text>" out.pgm
const { QRCodeWriter, BarcodeFormat } = require('@zxing/library');
const [text, out] = process.argv.slice(2);
const m = new QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 300, 300, new Map());
const w = m.getWidth(); const h = m.getHeight(); const pad = 40;
const W = w + 2 * pad; const H = h + 2 * pad;
const px = Buffer.alloc(W * H, 255);
for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (m.get(x, y)) px[(y + pad) * W + x + pad] = 0;
require('fs').writeFileSync(out, Buffer.concat([Buffer.from(`P5\n${W} ${H}\n255\n`), px]));
