// file: esbuild.js

const { build } = require("esbuild");
const glob = require("glob");
const fs = require("fs-extra");

const baseConfig = {
	bundle: true,
	minify: process.env.NODE_ENV === "production",
	sourcemap: process.env.NODE_ENV !== "production",
	loader: {
		".wasm": "file",
	},
	outbase: "src",
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
