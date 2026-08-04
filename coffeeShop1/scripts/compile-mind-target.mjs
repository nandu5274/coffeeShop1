import { writeFile } from 'fs/promises';
import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

async function loadCompiler() {
  // mind-ar UMD build
  const candidates = [
    'mind-ar/dist/mindar-image.prod.js',
    'mind-ar/dist/mindar-image-aframe.prod.js'
  ];

  for (const id of candidates) {
    try {
      const mod = require(id);
      const Compiler = mod.OfflineCompiler || mod.Compiler || mod.MINDAR?.Compiler || mod.MINDAR?.IMAGE?.Compiler;
      if (Compiler) {
        console.log('Using compiler from', id, Object.keys(mod).slice(0, 12));
        return Compiler;
      }
      console.log('Loaded', id, 'keys:', Object.keys(mod).slice(0, 20));
    } catch (e) {
      console.warn('Failed', id, e.message);
    }
  }

  // ESM attempt
  try {
    const url = pathToFileURL(require.resolve('mind-ar/dist/mindar-image.prod.js')).href;
    const mod = await import(url);
    const Compiler = mod.OfflineCompiler || mod.Compiler || mod.default?.Compiler;
    if (Compiler) return Compiler;
    console.log('ESM keys', Object.keys(mod));
  } catch (e) {
    console.warn('ESM import failed', e.message);
  }

  throw new Error('MindAR Compiler not found');
}

const Compiler = await loadCompiler();
const imgPath = resolve(root, 'src/assets/img/hero-m-bg.jpg');
const image = await loadImage(imgPath);
console.log('Loaded mural', image.width, 'x', image.height);

const compiler = new Compiler();
await compiler.compileImageTargets([image], (progress) => {
  const p = Number(progress);
  if (!Number.isNaN(p) && Math.floor(p) % 5 === 0) {
    console.log('compile progress', p.toFixed(1) + '%');
  }
});

const buffer = await compiler.exportData();
const outPath = resolve(root, 'src/assets/targets.mind');
await writeFile(outPath, Buffer.from(buffer));
console.log('Wrote', outPath, 'bytes=', buffer.byteLength || buffer.length);
