const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const libDir = path.join(rootDir, 'lib');
const nodeModulesDir = path.join(rootDir, 'node_modules');
const EXT_RE = /\.(js|json|cjs|mjs|d\.ts)$/;

const NODE_BUILTIN_SUBPATHS = new Set([
    'stream/promises', 'fs/promises', 'path/posix', 'path/win32',
    'util/types', 'dns/promises', 'timers/promises'
]);

let fixed = 0;

function resolveRelative(fromFile, p) {
    const fromDir = path.dirname(fromFile);
    const abs = path.resolve(fromDir, p);
    if (fs.existsSync(abs + '.js')) return p + '.js';
    if (fs.existsSync(path.join(abs, 'index.js'))) return p + '/index.js';
    return p + '.js';
}

function resolvePackageSubpath(p) {
    if (NODE_BUILTIN_SUBPATHS.has(p)) return p;
    // Only handle subpath imports (contain '/' after package name)
    const slashIdx = p.startsWith('@') ? p.indexOf('/', p.indexOf('/') + 1) : p.indexOf('/');
    if (slashIdx === -1) return p; // root package import, leave alone
    const abs = path.join(nodeModulesDir, p);
    if (fs.existsSync(abs + '.js')) return p + '.js';
    if (fs.existsSync(path.join(abs, 'index.js'))) return p + '/index.js';
    return p; // can't resolve, leave as-is
}

const IMPORT_RE = /(from\s+['"])(\.?\.?[^'"]+?)(['"]\s*;?)/g;

function processFile(fpath) {
    const content = fs.readFileSync(fpath, 'utf8');
    const patched = content.replace(IMPORT_RE, (m, pre, p, suf) => {
        if (EXT_RE.test(p)) return m;
        let resolved;
        if (p.startsWith('.')) {
            resolved = resolveRelative(fpath, p);
        } else {
            resolved = resolvePackageSubpath(p);
        }
        if (resolved !== p) fixed++;
        return pre + resolved + suf;
    });
    if (patched !== content) fs.writeFileSync(fpath, patched);
}

function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) { walk(full); continue; }
        if (entry.endsWith('.js') || entry.endsWith('.d.ts')) processFile(full);
    }
}

walk(libDir);
console.log('fix-esm: patched', fixed, 'import paths');
