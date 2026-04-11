import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = process.cwd();
const DATA_DIR = process.env.DATA_DIR || ROOT;

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const FOTOS_DIR = path.join(DATA_DIR, 'fotos');

/**
 * Generate a unique filename from the original name.
 * Format: <timestamp>-<random>.<ext>
 */
export function generateFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  return `${timestamp}-${random}${ext}`;
}

/**
 * Save a Web API File to disk.
 * Returns the URL path (e.g. /uploads/... or /fotos/...).
 */
export async function saveFile(
  file: File,
  destDir: string = UPLOADS_DIR
): Promise<string> {
  // Ensure directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const filename = generateFilename(file.name);
  const filepath = path.join(destDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  // Determine URL prefix based on destination directory
  const dirName = path.basename(destDir);
  return `/${dirName}/${filename}`;
}
