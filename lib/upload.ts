import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

const ROOT = process.cwd();
const DATA_DIR = process.env.DATA_DIR || ROOT;

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const FOTOS_DIR = path.join(DATA_DIR, 'fotos');

// Image MIME types that sharp can convert to webp
const CONVERTIBLE = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
  'image/gif',
]);

// Formats we should keep as-is (sharp either can't improve or would lose data)
const PASSTHROUGH_EXT = new Set(['.svg', '.ico']);

/**
 * Generate a unique filename.
 * Format: <timestamp>-<random>.<ext>
 */
export function generateFilename(ext: string): string {
  const clean = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  return `${timestamp}-${random}${clean}`;
}

/**
 * Save a Web API File to disk.
 * - Images (jpeg/png/webp/avif/tiff/gif) are converted to WebP (quality 82).
 * - SVG/ICO and other non-image files are saved as-is.
 *
 * Returns the URL path (e.g. /uploads/... or /fotos/...).
 */
export async function saveFile(
  file: File,
  destDir: string = UPLOADS_DIR
): Promise<string> {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const originalExt = path.extname(file.name).toLowerCase();
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  const shouldConvert =
    CONVERTIBLE.has(file.type) && !PASSTHROUGH_EXT.has(originalExt);

  let filename: string;
  let outputBuffer: Buffer;

  if (shouldConvert) {
    try {
      outputBuffer = await sharp(inputBuffer)
        .rotate() // auto-orient from EXIF
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
      filename = generateFilename('.webp');
    } catch (err) {
      // If conversion fails, fall back to saving the original.
      console.error('[upload] sharp conversion failed, saving original:', err);
      outputBuffer = inputBuffer;
      filename = generateFilename(originalExt || '.bin');
    }
  } else {
    outputBuffer = inputBuffer;
    filename = generateFilename(originalExt || '.bin');
  }

  const filepath = path.join(destDir, filename);
  fs.writeFileSync(filepath, outputBuffer);

  const dirName = path.basename(destDir);
  return `/${dirName}/${filename}`;
}
