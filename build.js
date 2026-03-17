const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const INCLUDES_DIR = path.join(__dirname, 'includes');
const OUT_DIR = __dirname;

// Cache loaded includes
const includeCache = {};

function loadInclude(name) {
    if (includeCache[name]) return includeCache[name];
    const filePath = path.join(INCLUDES_DIR, `${name}.html`);
    if (!fs.existsSync(filePath)) {
        console.warn(`  Warning: include "${name}" not found at ${filePath}`);
        return '';
    }
    includeCache[name] = fs.readFileSync(filePath, 'utf8');
    return includeCache[name];
}

function processFile(srcFile) {
    let content = fs.readFileSync(srcFile, 'utf8');

    // Replace <!-- include:name --> markers with include contents
    content = content.replace(/<!--\s*include:(\w[\w-]*)\s*-->/g, (match, name) => {
        return loadInclude(name);
    });

    return content;
}

function build() {
    console.log('Building MMK Accountants website...\n');

    if (!fs.existsSync(SRC_DIR)) {
        console.error('Error: src/ directory not found');
        process.exit(1);
    }

    const srcFiles = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.html'));
    console.log(`Found ${srcFiles.length} source files\n`);

    let built = 0;
    for (const file of srcFiles) {
        const srcPath = path.join(SRC_DIR, file);
        const outPath = path.join(OUT_DIR, file);
        const result = processFile(srcPath);
        fs.writeFileSync(outPath, result, 'utf8');
        console.log(`  Built: ${file}`);
        built++;
    }

    console.log(`\nDone! ${built} pages built.`);
}

build();
