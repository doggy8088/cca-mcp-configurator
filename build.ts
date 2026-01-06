import { readFileSync, writeFileSync } from 'fs';
import { minify as minifyCSS } from 'csso';
import { minify as minifyJS } from 'terser';
import { minify as minifyHTML } from 'html-minifier-terser';
import { loadPresets } from './scripts/merge-presets';

function injectAppVersion(html: string, version: string): string {
  const metaTagRegex = /<meta\b[^>]*\bname=(["'])app-version\1[^>]*>/i;

  if (!metaTagRegex.test(html)) {
    return html.replace(/<\/head>/i, `  <meta name="app-version" content="${version}">\n</head>`);
  }

  return html.replace(metaTagRegex, (tag) => {
    if (/\bcontent=/.test(tag)) {
      return tag.replace(/\bcontent=(['"])[^'"]*\1/i, `content="${version}"`);
    }
    return tag.replace(/\/?>$/, (end) => ` content="${version}"${end}`);
  });
}

async function build() {
  console.log('🔨 Building and minifying...');

  // Read source files
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const appVersion = pkg?.version ?? 'dev';

  // Load and merge presets
  console.log('📋 Loading presets...');
  const presets = loadPresets('presets');
  console.log(`✅ Loaded ${presets.length} preset(s)`);

  const css = readFileSync('src/styles.css', 'utf8');
  let ts = readFileSync('src/app.ts', 'utf8');
  const html = readFileSync('src/index.html', 'utf8');

  // Inject presets into TypeScript code
  const presetsJson = JSON.stringify(presets, null, 2);
  ts = ts.replace(
    /const PRESETS:.*?= \[\];/s,
    `const PRESETS: Preset[] = ${presetsJson};`
  );

  // Minify CSS
  console.log('📦 Minifying CSS...');
  const minifiedCSS = minifyCSS(css).css;
  writeFileSync('dist/styles.min.css', minifiedCSS);
  
  // Write modified TypeScript to a temporary file
  const tmpDir = process.env.TMPDIR || process.env.TEMP || '/tmp';
  const tmpFile = `${tmpDir}/app-temp.ts`;
  writeFileSync(tmpFile, ts);

  // Transpile TypeScript to JavaScript using Bun
  console.log('📦 Transpiling TypeScript to JavaScript...');
  const transpiled = await Bun.build({
    entrypoints: [tmpFile],
    target: 'browser',
    minify: false,
    sourcemap: 'none'
  });

  if (!transpiled.success) {
    console.error('Transpilation failed:', transpiled.logs);
    throw new Error('TypeScript transpilation failed');
  }

  const jsCode = await transpiled.outputs[0].text();

  // Minify JS
  console.log('📦 Minifying JavaScript...');
  const minifiedJSResult = await minifyJS(jsCode, {
    compress: {
      dead_code: true,
      drop_console: false,
      drop_debugger: true,
      keep_classnames: false,
      keep_fnames: false,
    },
    mangle: {
      toplevel: false, // Don't mangle top-level names (for onclick handlers)
      reserved: [
        'togglePreset',
        'openAddCustomModal',
        'closeCustomModal',
        'editCustom',
        'deleteCustom',
        'editPreset',
        'updateConnectionTypeFields',
        'updateFromJson',
        'copyToClipboard',
        'exportConfig',
        'importConfig',
        'copyCodeBlock',
        'copyPath',
        'saveCustomModal'
      ]
    },
    format: {
      comments: false,
    },
  });
  writeFileSync('dist/app.min.js', minifiedJSResult.code || '');

  // Update HTML to use minified files and minify
  console.log('📦 Minifying HTML...');
  const htmlWithMinified = injectAppVersion(html, appVersion)
    .replace('href="styles.css"', 'href="styles.min.css"')
    .replace('src="app.ts"', 'src="app.min.js"');
  
  const minifiedHTML = await minifyHTML(htmlWithMinified, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyCSS: true,
    minifyJS: true,
  });
  writeFileSync('dist/index.html', minifiedHTML);

  // Calculate savings
  const cssOrigSize = Buffer.byteLength(css, 'utf8');
  const cssMinSize = Buffer.byteLength(minifiedCSS, 'utf8');
  const tsOrigSize = Buffer.byteLength(ts, 'utf8');
  const tsMinSize = Buffer.byteLength(minifiedJSResult.code || '', 'utf8');
  const htmlOrigSize = Buffer.byteLength(html, 'utf8');
  const htmlMinSize = Buffer.byteLength(minifiedHTML, 'utf8');

  console.log('\n✅ Build complete!');
  console.log(`CSS: ${cssOrigSize} → ${cssMinSize} bytes (${Math.round((1 - cssMinSize/cssOrigSize) * 100)}% reduction)`);
  console.log(`TS/JS: ${tsOrigSize} → ${tsMinSize} bytes (${Math.round((1 - tsMinSize/tsOrigSize) * 100)}% reduction)`);
  console.log(`HTML: ${htmlOrigSize} → ${htmlMinSize} bytes (${Math.round((1 - htmlMinSize/htmlOrigSize) * 100)}% reduction)`);
  console.log(`Total: ${cssOrigSize + tsOrigSize + htmlOrigSize} → ${cssMinSize + tsMinSize + htmlMinSize} bytes\n`);
}

build().catch(console.error);
