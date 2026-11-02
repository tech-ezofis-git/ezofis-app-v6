// Read a QR code or barcode from a photo (camera or gallery through the file picker, so no extra camera permission
// is needed in either APK). Uses the platform BarcodeDetector when there is one, else @zxing/library (loaded on demand).
// Formats as in the web field settings: QR Code, Code 128, EAN-13, plus the other common 1D/2D formats zxing reads.

function loadImage(src) {
  return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => reject(new Error('Could not open the photo')); i.src = src; });
}
// phone photos are large; zxing is faster and as accurate on a ~1600 px copy
async function scaled(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return { canvas: c, image: await loadImage(c.toDataURL('image/png')) };
  } finally { URL.revokeObjectURL(url); }
}

export async function decodeImage(file) {
  const { canvas, image } = await scaled(file);
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try { const found = await new window.BarcodeDetector().detect(canvas); if (found && found[0] && found[0].rawValue) return found[0].rawValue; } catch (e) { /* fall back to zxing */ }
  }
  const { BrowserMultiFormatReader, DecodeHintType } = await import('@zxing/library');
  const hints = new Map([[DecodeHintType.TRY_HARDER, true]]);
  try {
    const r = await new BrowserMultiFormatReader(hints).decodeFromImageElement(image);
    return r.getText();
  } catch (e) {
    throw new Error("No QR code or barcode found in the photo. Try again closer, with the code flat and in focus.");
  }
}

// scanned text → a value the field accepts (web normalizeScannedValue); undefined when it doesn't fit the type
export function forKind(kind, text) {
  const t = String(text == null ? '' : text).trim();
  if (!t) return undefined;
  if (kind === 'number' || kind === 'counter' || kind === 'currency') { const n = Number(t.replace(/[\s,]/g, '')); return Number.isFinite(n) ? String(n) : undefined; }
  if (kind === 'date' || kind === 'datetime') {
    const d = new Date(t);
    if (isNaN(d)) return undefined;
    const p = (n) => String(n).padStart(2, '0');
    const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    return kind === 'date' ? day : `${day} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  return t;
}
