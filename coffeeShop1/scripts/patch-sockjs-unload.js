/**
 * SockJS registers window "unload" for cleanup. Chrome blocks that via
 * Permissions-Policy and logs a violation (often mis-attributed in DevTools).
 * Remap to pagehide after each npm install.
 */
const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '../node_modules/sockjs-client/lib/utils/event.js'),
  path.join(__dirname, '../node_modules/sockjs-client/dist/sockjs.js'),
];

const from = "attachEvent('unload', unloadTriggered)";
const to = "attachEvent('pagehide', unloadTriggered)";
// minified dist variant
const fromMin = 'attachEvent("unload",';
const toMin = 'attachEvent("pagehide",';

for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, 'utf8');
  let next = src.split(from).join(to);
  if (file.endsWith('sockjs.min.js') || src.includes(fromMin)) {
    next = next.split(fromMin).join(toMin);
  }
  // also cover: t.exports.attachEvent("unload",function
  next = next.replace(/attachEvent\(["']unload["']/g, (m) => m.replace('unload', 'pagehide'));
  if (next !== src) {
    fs.writeFileSync(file, next);
    console.log('patched sockjs unload → pagehide:', path.relative(process.cwd(), file));
  } else if (src.includes('pagehide') && src.includes('unloadTriggered')) {
    console.log('already patched:', path.relative(process.cwd(), file));
  } else {
    console.warn('no unload attachEvent found in', path.relative(process.cwd(), file));
  }
}
