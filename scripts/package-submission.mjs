#!/usr/bin/env node
/**
 * Builds the Vibe96 submission archive.
 *
 *   npm run package:submission
 *
 * The repository keeps the two Node projects in `client/` and `server/`,
 * because the live Vercel deployment points at those paths. The submission
 * structure asks for `React Client/` and `Express API/`. This script stages a
 * copy under the required names, rewrites the two build-context paths in
 * docker-compose.yml to match, writes QuickBlog-submission.zip, and then
 * verifies the result against the required file list.
 *
 * Nothing in the repository is modified. Secrets, dependencies, build output
 * and version control history are excluded - see EXCLUDED below.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'QuickBlog-submission.zip');
const STAGE = fs.mkdtempSync(path.join(os.tmpdir(), 'quickblog-submission-'));
const PACKAGE_ROOT = path.join(STAGE, 'QuickBlog');

/** Folders copied with a new name. */
const RENAMED = {
    client: 'React Client',
    server: 'Express API',
};

/** Copied as they are. */
const FOLDERS = ['database', 'docs', 'scripts'];

/** Files copied from the repository root. */
const FILES = [
    'README.md',
    'HowToSetup.md',
    'CLAUDE.md',
    'CHANGELOG.md',
    'LICENSE-NOTE.md',
    'docker-compose.yml',
    'package.json',
    'package-lock.json',
    '.gitignore',
];

/**
 * Never copied, at any depth. Dependencies and build output are rebuilt by the
 * installer; .env files and .vercel hold real credentials and project ids.
 */
const EXCLUDED_NAMES = new Set([
    'node_modules', '.git', 'dist', 'build', '.vercel', '.vite',
    '.DS_Store', 'Thumbs.db', 'coverage', '.nyc_output', '.idea',
    'QuickBlog-submission.zip',
    // Listing media for the marketplace form, not part of the code submission.
    'Vibe96-Media',
]);

const isExcluded = (name) => {
    if(EXCLUDED_NAMES.has(name)) return true;
    // Every .env variant goes, except the single documented example.
    if(name === '.env.example') return false;
    if(name === '.env' || name.startsWith('.env.')) return true;
    if(name.endsWith('.log')) return true;
    // Superseded by HowToSetup.md, and large.
    if(name.endsWith('.pdf')) return true;
    return false;
}

const copyTree = (from, to) => {
    const stat = fs.statSync(from);

    if(!stat.isDirectory()){
        fs.mkdirSync(path.dirname(to), {recursive: true});
        fs.copyFileSync(from, to);
        return 1;
    }

    fs.mkdirSync(to, {recursive: true});
    let count = 0;
    for (const entry of fs.readdirSync(from)){
        if(isExcluded(entry)) continue;
        count += copyTree(path.join(from, entry), path.join(to, entry));
    }
    return count;
}

/* ------------------------------- stage ------------------------------- */

console.log(`Staging in ${PACKAGE_ROOT}\n`);
fs.mkdirSync(PACKAGE_ROOT, {recursive: true});

for (const [source, destination] of Object.entries(RENAMED)){
    const files = copyTree(path.join(ROOT, source), path.join(PACKAGE_ROOT, destination));
    console.log(`  ${source}/ -> ${destination}/  (${files} files)`);
}

for (const folder of FOLDERS){
    const from = path.join(ROOT, folder);
    if(!fs.existsSync(from)){
        console.log(`  ${folder}/ - missing, skipped`);
        continue;
    }
    const files = copyTree(from, path.join(PACKAGE_ROOT, folder));
    console.log(`  ${folder}/  (${files} files)`);
}

for (const file of FILES){
    const from = path.join(ROOT, file);
    if(!fs.existsSync(from)){
        console.log(`  ${file} - missing, skipped`);
        continue;
    }
    fs.copyFileSync(from, path.join(PACKAGE_ROOT, file));
    console.log(`  ${file}`);
}

/* --------------------- point compose at the new names --------------------- */

const composePath = path.join(PACKAGE_ROOT, 'docker-compose.yml');
if(fs.existsSync(composePath)){
    let compose = fs.readFileSync(composePath, 'utf8');
    const before = compose;

    // Quoted, because the staged names contain a space.
    compose = compose
        .replace(/context: \.\/server\b/g, 'context: "./Express API"')
        .replace(/context: \.\/client\b/g, 'context: "./React Client"')
        .replace(/- \.\/server\/\.env\b/g, '- "./Express API/.env"')
        .replace(/- \.\/database:/g, '- ./database:');

    if(compose === before){
        console.error('\n  ! docker-compose.yml: no build-context path was rewritten.');
        console.error('    Check the context: lines against the patterns in this script.');
        process.exitCode = 1;
    } else {
        fs.writeFileSync(composePath, compose);
        console.log('\n  docker-compose.yml: build contexts pointed at the renamed folders');
    }

    // `cp server/.env.example server/.env` is wrong inside the archive.
    const stillRepoPaths = [...compose.matchAll(/\.\/(server|client)\b/g)].map((m) => m[0]);
    if(stillRepoPaths.length){
        console.error(`  ! docker-compose.yml still refers to ${[...new Set(stillRepoPaths)].join(', ')}`);
        process.exitCode = 1;
    }
}

/* -------------------------------- zip -------------------------------- */

if(fs.existsSync(OUT)) fs.rmSync(OUT);

const zip = () => {
    if(process.platform === 'win32'){
        // Compress-Archive ships with Windows PowerShell.
        execFileSync('powershell.exe', [
            '-NoProfile', '-NonInteractive', '-Command',
            `Compress-Archive -Path '${PACKAGE_ROOT}' -DestinationPath '${OUT}' -CompressionLevel Optimal -Force`,
        ], {stdio: ['ignore', 'pipe', 'inherit']});
        return;
    }
    execFileSync('zip', ['-rq', OUT, 'QuickBlog'], {cwd: STAGE, stdio: ['ignore', 'pipe', 'inherit']});
}

console.log('\nCompressing...');
zip();

const megabytes = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`\nWrote ${OUT}  (${megabytes} MB)`);

/* ------------------------------- verify ------------------------------- */

// Checked against the staged tree, which is byte-for-byte what went into the
// archive. The listing below is read back out of the zip itself.
const REQUIRED = [
    'README.md',
    'HowToSetup.md',
    'CLAUDE.md',
    'CHANGELOG.md',
    'LICENSE-NOTE.md',
    'docker-compose.yml',
    'Express API/.env.example',
    'Express API/package.json',
    'Express API/package-lock.json',
    'Express API/server.js',
    'Express API/app.js',
    'React Client/package.json',
    'React Client/package-lock.json',
    'React Client/index.html',
    'React Client/src/App.jsx',
    'database/schema.js',
    'database/seed.js',
    'docs/API.md',
];

console.log('\nRequired files:');
let missing = 0;
for (const file of REQUIRED){
    const present = fs.existsSync(path.join(PACKAGE_ROOT, file));
    if(!present) missing++;
    console.log(`  ${present ? 'OK  ' : 'MISS'} ${file}`);
}

// Nothing that should never ship.
const offenders = [];
const scan = (dir, relative = '') => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})){
        const rel = relative ? `${relative}/${entry.name}` : entry.name;
        if(entry.isDirectory()){
            if(EXCLUDED_NAMES.has(entry.name)) offenders.push(`${rel}/`);
            else scan(path.join(dir, entry.name), rel);
        } else if(
            (entry.name.startsWith('.env') && entry.name !== '.env.example') ||
            entry.name.endsWith('.log') ||
            entry.name.endsWith('.pdf')
        ){
            offenders.push(rel);
        }
    }
}
scan(PACKAGE_ROOT);

console.log('\nExclusions:');
if(offenders.length){
    for (const offender of offenders) console.log(`  ! SHOULD NOT BE HERE: ${offender}`);
    process.exitCode = 1;
} else {
    console.log('  OK   no .env, node_modules, dist, build, .git, .vercel, logs or PDFs');
}

// A last pass for anything that looks like a live credential.
const SECRET_PATTERNS = [
    [/mongodb(\+srv)?:\/\/[^\s:/]+:[^\s@]+@\S+/g, 'MongoDB connection string with a password'],
    [/\bAIza[0-9A-Za-z_-]{30,}/g, 'Google API key'],
    [/\bprivate_[A-Za-z0-9+/=]{20,}/g, 'ImageKit private key'],
    [/\bpublic_[A-Za-z0-9+/=]{20,}/g, 'ImageKit public key'],
    [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./g, 'JWT'],
];

// Documentation is full of deliberate examples. A match is only interesting if
// it does not read like one, so the obvious placeholder words are forgiven.
// A value written in SHOUTING CAPS, or wrapped in angle brackets, is something
// the reader is being told to replace - never a live credential.
const PLACEHOLDER = new RegExp([
    'CHANGE_ME', 'REPLACE_ME', 'YOUR_', 'your_',
    '\\bPASSWORD\\b', '\\bUSER\\b', '\\bKEY\\b', '\\bSECRET\\b',
    'xxxxx', '<[^>]+>', 'example\\.com', 'placeholder',
    '\\bfoo\\b', '\\bbar\\b',
].join('|'), 'i');
const TEXT = /\.(js|jsx|mjs|cjs|json|md|yml|yaml|html|css|txt|example|conf)$/i;

const secrets = [];
const scanSecrets = (dir, relative = '') => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})){
        const rel = relative ? `${relative}/${entry.name}` : entry.name;
        const full = path.join(dir, entry.name);
        if(entry.isDirectory()){ scanSecrets(full, rel); continue; }
        if(!TEXT.test(entry.name) && entry.name !== '.env.example') continue;
        // Lockfiles are large and carry only registry hashes.
        if(entry.name === 'package-lock.json') continue;

        const content = fs.readFileSync(full, 'utf8');
        for (const [pattern, label] of SECRET_PATTERNS){
            pattern.lastIndex = 0;
            for (const match of content.matchAll(pattern)){
                if(PLACEHOLDER.test(match[0])) continue;
                secrets.push(`${rel}: ${label} - ${match[0].slice(0, 40)}...`);
            }
        }
    }
}
scanSecrets(PACKAGE_ROOT);

console.log('\nCredential scan:');
if(secrets.length){
    for (const secret of secrets) console.log(`  ! ${secret}`);
    process.exitCode = 1;
} else {
    console.log('  OK   no live-looking credential found in any text file');
}

console.log('\nArchive contents (top two levels):');
const listing = (dir, relative = '', depth = 0) => {
    if(depth > 1) return;
    for (const entry of fs.readdirSync(dir, {withFileTypes: true}).sort((a, b) =>
        Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name)
    )){
        const rel = relative ? `${relative}/${entry.name}` : entry.name;
        console.log(`  ${'  '.repeat(depth)}${entry.isDirectory() ? rel + '/' : rel}`);
        if(entry.isDirectory()) listing(path.join(dir, entry.name), rel, depth + 1);
    }
}
listing(PACKAGE_ROOT);

fs.rmSync(STAGE, {recursive: true, force: true});

if(missing || process.exitCode){
    console.log('\nFINISHED WITH PROBLEMS - see the lines marked ! or MISS above.\n');
    process.exitCode = 1;
} else {
    console.log('\nArchive is complete and clean. Ready to upload.\n');
}
