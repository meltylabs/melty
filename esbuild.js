// file: esbuild.js

const { build } = require("esbuild");
const glob = require("glob");
const fs = require("fs-extra");
const chokidar = require("chokidar");
const path = require("path");

const baseConfig = {
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  sourcemap: process.env.NODE_ENV !== "production",
  loader: {
    '.wasm': 'file'
  },
  outbase: 'src'
};

const extensionConfig = {
  ...baseConfig,
  platform: "node",
  mainFields: ["module", "main"],
  format: "cjs",
  entryPoints: ["./src/extension.ts"],
  outfile: "./out/extension.js",
  external: ["vscode"],
  treeShaking: true,
};

const testConfig = {
  ...baseConfig,
  platform: "node",
  format: "cjs",
  entryPoints: glob.sync("./src/test/**/*.test.ts"),
  outdir: "./out",
  external: ["vscode"],
};

const watchConfig = {
  watch: {
    onRebuild(error, result) {
      console.log("[watch] build started");
      if (error) {
        error.errors.forEach((error) =>
          console.error(
            `> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`
          )
        );
      } else {
        console.log("[watch] build finished");
      }
    },
  },
};

const copyLibFolder = async () => {
  await fs.copy("./src/lib", "./out/lib");
  console.log("Lib folder copied to out directory");
};

const watchWebview = () => {
  const watcher = chokidar.watch('./webview-ui/src', {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  watcher
    .on('change', async (path) => {
      console.log(`File ${path} has been changed. Rebuilding webview...`);
      try {
        await fs.remove('./webview-ui/build');
        await new Promise((resolve, reject) => {
          const child = require('child_process').spawn('npm', ['run', 'build:webview'], { stdio: 'inherit' });
          child.on('close', (code) => {
            if (code !== 0) {
              reject(new Error(`Webview build process exited with code ${code}`));
            } else {
              resolve();
            }
          });
        });
        console.log('Webview rebuilt successfully');
      } catch (error) {
        console.error('Error rebuilding webview:', error);
      }
    });
};

(async () => {
  const args = process.argv.slice(2);
  try {
    if (args.includes("--watch")) {
      // Build and watch extension and test code
      console.log("[watch] build started");
      await build({
        ...extensionConfig,
        ...watchConfig,
      });
      await build({
        ...testConfig,
        ...watchConfig,
      });
      await copyLibFolder();
      console.log("[watch] build finished");
      
      // Start watching webview
      watchWebview();
    } else {
      // Build extension and test code
      await build(extensionConfig);
      await build(testConfig);
      await copyLibFolder();
      console.log("build complete");
    }
  } catch (err) {
    process.stderr.write(err.stderr);
    process.exit(1);
  }
})();
