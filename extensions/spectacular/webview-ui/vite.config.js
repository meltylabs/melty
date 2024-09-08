import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from "tailwindcss";

export default defineConfig(() => {
	return {
		build: {
			outDir: 'build',
			rollupOptions: {
				output: {
					// Ensure that the output files are named `main.js` and `main.css`
					entryFileNames: 'assets/main.js',
					assetFileNames: (assetInfo) => {
						if (assetInfo.name === 'index.css') {
							return 'assets/main.css';
						}
						return 'assets/[name].[ext]';
					},
				},
			},
		},
		plugins: [react(), {
			css: {
				postcss: {
					plugins: [tailwindcss()],
				},
			},
		}],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, 'src'),
			}
		}
	};
});
