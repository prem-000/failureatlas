/**
 * render-via-ink.mjs
 * Renders .mmd files to SVG using mermaid.ink (no local install needed).
 * Usage: node docs/diagrams/render-via-ink.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mmdDir = join(__dirname, 'mmd');
const outDir = __dirname;

const files = readdirSync(mmdDir).filter(f => f.endsWith('.mmd'));
console.log(`Rendering ${files.length} diagrams via mermaid.ink...\n`);

let ok = 0, fail = 0;

for (const file of files) {
  const mmd = readFileSync(join(mmdDir, file), 'utf-8');
  const svgName = basename(file, extname(file)) + '.svg';
  const encoded = Buffer.from(mmd, 'utf-8').toString('base64url');
  const url = `https://mermaid.ink/svg/${encoded}?bgColor=!white`;

  process.stdout.write(`  ${file} → ${svgName} ... `);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const svg = await res.text();
    writeFileSync(join(outDir, svgName), svg, 'utf-8');
    console.log('✅');
    ok++;
  } catch (e) {
    console.log(`❌ ${e.message}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} success, ${fail} failed.`);
