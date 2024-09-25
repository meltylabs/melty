import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as chokidar from 'chokidar';
import ignore from 'ignore';
import { MeltyFile } from '../types';
import { ContextProvider } from 'services/ContextProvider';

interface MeltycatConfig {
	pollMode: boolean;
	pollInterval: number;
	batchSize: number;
}

export class MeltycatService {
	private static instance: MeltycatService | null = null;

	private summaryPath: string;
	private watchPath: string;
	private summaries: Map<string, MeltyFile>;
	private watcher: chokidar.FSWatcher | null;
	private ignoreFilter: ReturnType<typeof ignore>;
	private maxFileSize: number = 1024 * 1024; // 1MB max file size
	private maxDepth: number = 10; // Maximum directory depth
	private config: MeltycatConfig;
	private pendingChanges: Set<string>;
	private updateTimer: NodeJS.Timeout | null;

	public static getInstance(): MeltycatService {
		if (!MeltycatService.instance) {
			MeltycatService.instance = new MeltycatService();
		}
		return MeltycatService.instance;
	}

	constructor(
		private readonly _contextProvider: ContextProvider = ContextProvider.getInstance()
	) {
		this.watchPath = this._contextProvider.meltyRootAbsolute;
		this.summaryPath = path.join(this.watchPath, '.meltycat');
		this.summaries = new Map();
		this.ignoreFilter = ignore();
		this.watcher = null;
		this.pendingChanges = new Set();
		this.updateTimer = null;

		// hardcode to poll mode since it's more robust
		this.config = {
			pollMode: true,
			pollInterval: 500,
			batchSize: 500
		};
	}

	async start(): Promise<void> {
		console.log(`Starting summary service in: ${this.watchPath}`);
		console.log(`Summary file will be saved at: ${this.summaryPath}`);
		console.log(`Mode: ${this.config.pollMode ? 'Poll' : 'Watch'}`);

		await this.loadIgnoreFiles();
		console.log('Loaded ignore patterns');

		await this.initializeWatcher();

		console.log('Summary service started successfully.');
	}

	private async initializeWatcher(): Promise<void> {
		const watchOptions: chokidar.ChokidarOptions = {
			persistent: true,
			ignoreInitial: false,
			depth: this.maxDepth,
			awaitWriteFinish: {
				stabilityThreshold: 750,
				pollInterval: 100
			},
			usePolling: this.config.pollMode,
			interval: this.config.pollMode ? this.config.pollInterval : undefined,
		};

		this.watcher = chokidar.watch(this.watchPath, watchOptions);

		console.log(`Watcher initialized (${this.config.pollMode ? 'polling' : 'watch'} mode)`);

		this.watcher
			.on('add', (path) => this.handleFileChange(path))
			.on('change', (path) => this.handleFileChange(path))
			.on('unlink', (path) => this.handleFileRemove(path))
			.on('error', (error) => console.error(`Watcher error: ${error}`));

		console.log('Watcher event handlers set up');

		this.watcher.on('ready', async () => {
			console.log('Initial scan complete. Ready for changes');
			console.log('Generating initial summary...');
			await this.regenerateSummary();
		});
	}

	private async loadIgnoreFiles(): Promise<void> {
		const ignoreFiles = [
			path.join(this.watchPath, '.meltycatignore'),
			path.join(this.watchPath, '.gitignore'),
			path.join(os.homedir(), '.gitignore'),
			path.join(this.watchPath, '.git', 'info', 'exclude')
		];

		for (const file of ignoreFiles) {
			try {
				const content = await fs.promises.readFile(file, 'utf-8');
				this.ignoreFilter.add(content);
				console.log(`Loaded ignore patterns from ${file}`);
			} catch (error) {
				// Ignore errors if file doesn't exist
				console.log(`Skipping ignore patterns file: ${file}`);
			}
		}

		// always ignore these files
		this.ignoreFilter.add('**/.git');
		this.ignoreFilter.add('**/.meltycatignore');
		this.ignoreFilter.add('**/.meltycat');
	}

	private isIgnored(filePath: string): boolean {
		const relativePath = path.relative(this.watchPath, filePath);
		// If the path is empty (root directory), ignore it. ignoreFilter can't take empty string.
		if (relativePath === '') {
			return true;
		}

		return this.ignoreFilter.ignores(relativePath);
	}

	private async handleFileChange(filePath: string): Promise<void> {
		const relativePath = path.relative(this.watchPath, filePath);

		if (this.isIgnored(filePath)) {
			return;
		}

		this.pendingChanges.add(relativePath);
		this.scheduleBatchUpdate();
	}

	private scheduleBatchUpdate(): void {
		if (this.updateTimer) {
			clearTimeout(this.updateTimer);
		}

		this.updateTimer = setTimeout(() => this.processBatchUpdate(), this.config.pollInterval);
	}

	private async processBatchUpdate(): Promise<void> {
		const changes = Array.from(this.pendingChanges).slice(0, this.config.batchSize);

		console.log(`Processing batch update (${changes.length} files)`);

		for (const relativePath of changes) {
			const filePath = path.join(this.watchPath, relativePath);
			try {
				const stats = await fs.promises.stat(filePath);

				if (!stats.isFile() || stats.size > this.maxFileSize) {
					console.log(`File changed [SKIPPED]: ${relativePath} (not a file or too large)`);
					this.pendingChanges.delete(relativePath);
					continue;
				}

				const contents = await this.readFileContent(filePath);
				if (contents !== null) {
					this.summaries.set(relativePath, { relPath: relativePath, contents });
					console.log(`File changed [UPDATED]: ${relativePath}`);
				}
			} catch (error) {
				console.error(`File changed [ERROR]: ${relativePath}:`, error);
			}
			this.pendingChanges.delete(relativePath);
		}

		await this.updateSummaryFile();

		if (this.pendingChanges.size > 0) {
			this.scheduleBatchUpdate();
		}
	}

	private async handleFileRemove(filePath: string): Promise<void> {
		const relativePath = path.relative(this.watchPath, filePath);
		console.log(`File removed: ${relativePath}`);
		this.summaries.delete(relativePath);
		this.pendingChanges.delete(relativePath);
		await this.updateSummaryFile();
	}

	private async readFileContent(filePath: string): Promise<string | null> {
		try {
			const buffer = await fs.promises.readFile(filePath, { encoding: 'utf8', flag: 'r' });
			if (this.isBinary(buffer)) {
				return null;
			}
			return buffer;
		} catch (error) {
			console.error(`Error reading file ${filePath}:`, error);
			return null;
		}
	}

	private isBinary(content: string): boolean {
		const sampleSize = Math.min(1024, content.length);
		for (let i = 0; i < sampleSize; i++) {
			if (content.charCodeAt(i) === 0) { return true; }
		}
		return false;
	}

	private async regenerateSummary(): Promise<void> {
		console.log('Regenerating summary from scratch...');
		this.summaries.clear();

		const files = await this.getAllFiles(this.watchPath);
		for (const file of files) {
			await this.handleFileChange(file);
		}

		await this.updateSummaryFile();
		console.log('Summary regenerated successfully.');
	}

	private async getAllFiles(dir: string, currentDepth: number = 0): Promise<string[]> {
		if (currentDepth >= this.maxDepth) {
			return [];
		}

		const entries = await fs.promises.readdir(dir, { withFileTypes: true });
		const files = await Promise.all(entries.map(async (entry) => {
			const res = path.resolve(dir, entry.name);
			if (this.isIgnored(res)) {
				return [];
			}
			return entry.isDirectory() ? this.getAllFiles(res, currentDepth + 1) : [res];
		}));
		return Array.prototype.concat(...files);
	}

	private async updateSummaryFile(): Promise<void> {
		try {
			await fs.promises.writeFile(this.summaryPath, this.getSummary(), 'utf8');
		} catch (error) {
			console.error('Error writing summary file:', error);
		}
	}

	public getSummary(): string {
		// todo: this summary might not be up to date
		// also we need a way to pick the files we're going to summarize, I think
		const summaryContent = Array.from(this.summaries.values())
			.map(summary => `<file_contents file="${summary.relPath}">\n${summary.contents}\n</file_contents>`)
			.join('\n');
		return summaryContent;
	}
}
