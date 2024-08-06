const esbuild = require('esbuild');
const postcssPlugin = require('esbuild-plugin-postcss2');
const path = require('path');

const watch = process.argv.includes('--watch');

esbuild.build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
  outfile: 'build/bundle.js',
  loader: { 
    '.js': 'jsx',
    '.svg': 'file',
    '.png': 'file',
    '.jpg': 'file',
    '.gif': 'file'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  plugins: [
    postcssPlugin(),
    {
      name: 'alias-plugin',
      setup(build) {
        build.onResolve({ filter: /^@backend\// }, args => {
          return { path: path.resolve(__dirname, '..', 'src', 'backend', args.path.slice(9)) };
        });
      },
    },
  ],
  target: ['es2020'],
  platform: 'browser',
  watch: watch && {
    onRebuild(error, result) {
      if (error) console.error('watch build failed:', error)
      else console.log('watch build succeeded:', result)
    },
  },
}).catch(() => process.exit(1));

if (watch) {
  console.log('watching...');
}
