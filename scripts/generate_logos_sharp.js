import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const src = path.join(__dirname, '..', 'public', 'matex_logo.png');
const outDir = path.join(__dirname, '..', 'public', 'icons');

const sizes = [32, 64, 128, 256, 512];

(async function main() {
  if (!fs.existsSync(src)) {
    console.error('Source not found:', src);
    process.exit(2);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const s of sizes) {
    const out = path.join(outDir, `logo-${s}.png`);
    await sharp(src).resize(s, s, { fit: 'contain' }).png({ quality: 90 }).toFile(out);
    console.log('Wrote', out);
  }

  console.log('All logos generated (PNG only).');
})();
