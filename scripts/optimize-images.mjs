#!/usr/bin/env node
/**
 * Build-time image optimization (runs before vite build).
 * - Favicon / PWA maskable icons: recompress PNG in place (paths stay .png for HTML/manifest).
 * - Other rasters in public/ and src/assets/: resize (max edge), encode WebP, replace file.
 * - Existing .webp: re-encode with same limits (skip if in icon list by basename — none are webp).
 */

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const MAX_EDGE = 2560;
const WEBP_QUALITY = 82;
const WEBP_EFFORT = 4;

const SCAN_ROOTS = [path.join(ROOT, 'public'), path.join(ROOT, 'src', 'assets')];

function isIconPng(relPosix) {
  const b = path.basename(relPosix);
  if (/^favicon/i.test(b) && b.endsWith('.png')) return true;
  if (b === 'apple-touch-icon.png') return true;
  if (/^web-app-manifest-/i.test(b) && b.endsWith('.png')) return true;
  return false;
}

async function* walkFiles(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkFiles(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

function isRasterExt(ext) {
  const e = ext.toLowerCase();
  return e === '.png' || e === '.jpg' || e === '.jpeg' || e === '.webp';
}

async function processIconPng(absPath) {
  const buf = await fs.readFile(absPath);
  const out = await sharp(buf)
    .rotate()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  if (out.length < buf.length) {
    await fs.writeFile(absPath, out);
    return { saved: buf.length - out.length, action: 'png-recompress' };
  }
  return { saved: 0, action: 'png-skip-larger' };
}

async function processToWebp(absPath, relPosix) {
  const buf = await fs.readFile(absPath);
  const meta = await sharp(buf).rotate().metadata();

  let transformer = sharp(buf).rotate();
  if (
    meta.width &&
    meta.height &&
    (meta.width > MAX_EDGE || meta.height > MAX_EDGE)
  ) {
    transformer = sharp(buf)
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true
      });
  }

  const webpBuf = await transformer.webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT }).toBuffer();
  const newPath = absPath.replace(/\.(png|jpe?g|webp)$/i, '.webp');

  if (newPath === absPath) {
    if (webpBuf.length <= buf.length) {
      await fs.writeFile(absPath, webpBuf);
      return { saved: buf.length - webpBuf.length, action: 'webp-recompress' };
    }
    return { saved: 0, action: 'webp-skip-larger' };
  }

  await fs.writeFile(newPath, webpBuf);
  await fs.unlink(absPath);
  return {
    saved: buf.length - webpBuf.length,
    action: 'to-webp',
    from: relPosix,
    to: relPosix.replace(/\.(png|jpe?g|webp)$/i, '.webp')
  };
}

async function main() {
  let totalSaved = 0;
  const log = [];

  for (const root of SCAN_ROOTS) {
    for await (const absPath of walkFiles(root)) {
      const rel = path.relative(ROOT, absPath);
      const relPosix = rel.split(path.sep).join('/');
      const ext = path.extname(absPath);
      if (!isRasterExt(ext)) continue;

      if (isIconPng(relPosix) && ext.toLowerCase() === '.png') {
        const r = await processIconPng(absPath);
        totalSaved += r.saved;
        if (r.saved > 0) log.push(`${relPosix}: ${r.action} (−${(r.saved / 1024).toFixed(1)} KiB)`);
        continue;
      }

      const r = await processToWebp(absPath, relPosix);
      totalSaved += Math.max(0, r.saved);
      if (r.action === 'to-webp') {
        log.push(`${r.from} → ${r.to} (−${(r.saved / 1024).toFixed(1)} KiB)`);
      } else if (r.saved > 0) {
        log.push(`${relPosix}: ${r.action} (−${(r.saved / 1024).toFixed(1)} KiB)`);
      }
    }
  }

  if (log.length) {
    console.log('[optimize-images]', log.slice(0, 40).join('\n'));
    if (log.length > 40) console.log(`[optimize-images] … and ${log.length - 40} more`);
  }
  console.log(
    `[optimize-images] done. Estimated total reduction: ${(totalSaved / 1024).toFixed(1)} KiB`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
