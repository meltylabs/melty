// file: esbuild.js

const { build } = require("esbuild");
const glob = require("glob");
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
  plugins: [
    {
      name: 'alias',
      setup(build) {
        build.onResolve({ filter: /^@backend\// }, args => {
          return { path: path.resolve(__dirname, 'src', 'backend', args.path.slice(9)) }
        })
      },
    },
  ],
};

const testConfig = {
  ...baseConfig,
  platform: "node",
  format: "cjs",
  entryPoints: glob.sync("./src/test/**/*.test.ts"),
  outdir: "./out/test",
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
      console.log("[watch] build finished");
    } else {
      // Build extension and test code
      await build(extensionConfig);
      await build(testConfig);
      console.log("build complete");
    }
  } catch (err) {
    process.stderr.write(err.stderr);
    process.exit(1);
  }
})();
