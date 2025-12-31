import { readFileSync, writeFileSync } from 'fs';
import { minify as minifyCSS } from 'csso';
import { minify as minifyJS } from 'terser';
import { minify as minifyHTML } from 'html-minifier-terser';

function injectAppVersion(html, version) {
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

  const css = readFileSync('src/styles.css', 'utf8');
  const js = readFileSync('src/app.js', 'utf8');
  const html = readFileSync('src/index.html', 'utf8');

  // Minify CSS
  console.log('📦 Minifying CSS...');
  const minifiedCSS = minifyCSS(css).css;
  writeFileSync('dist/styles.min.css', minifiedCSS);
  
  // Minify JS
  console.log('📦 Minifying JavaScript...');
  const minifiedJSResult = await minifyJS(js, {
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
        'importConfig'
      ]
    },
    format: {
      comments: false,
    },
  });
  writeFileSync('dist/app.min.js', minifiedJSResult.code);

  // Update HTML to use minified files and minify
  console.log('📦 Minifying HTML...');
  const htmlWithMinified = injectAppVersion(html, appVersion)
    .replace('href="styles.css"', 'href="styles.min.css"')
    .replace('src="app.js"', 'src="app.min.js"');
  
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
  const jsOrigSize = Buffer.byteLength(js, 'utf8');
  const jsMinSize = Buffer.byteLength(minifiedJSResult.code, 'utf8');
  const htmlOrigSize = Buffer.byteLength(html, 'utf8');
  const htmlMinSize = Buffer.byteLength(minifiedHTML, 'utf8');

  console.log('\n✅ Build complete!');
  console.log(`CSS: ${cssOrigSize} → ${cssMinSize} bytes (${Math.round((1 - cssMinSize/cssOrigSize) * 100)}% reduction)`);
  console.log(`JS: ${jsOrigSize} → ${jsMinSize} bytes (${Math.round((1 - jsMinSize/jsOrigSize) * 100)}% reduction)`);
  console.log(`HTML: ${htmlOrigSize} → ${htmlMinSize} bytes (${Math.round((1 - htmlMinSize/htmlOrigSize) * 100)}% reduction)`);
  console.log(`Total: ${cssOrigSize + jsOrigSize + htmlOrigSize} → ${cssMinSize + jsMinSize + htmlMinSize} bytes\n`);
}

build().catch(console.error);
