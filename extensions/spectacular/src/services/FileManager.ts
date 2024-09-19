import * as vscode from "vscode";
import * as config from "../util/config";
import * as path from "path";
import * as fs from "fs/promises";
import { WebviewNotifier } from "./WebviewNotifier";
import { GitManager } from 'services/GitManager';
import { ContextPaths } from 'types';

const webviewNotifier = WebviewNotifier.getInstance();

/**
 * Handles both workspace files and meltyMind files.
 *
 * Key responsibilities and behaviors:
 * - Maintains the canonical lists of workspace files and meltyMind files.
 * - Responsible for updating the webview about the state of these file lists.
 * - Ensures the invariant: meltyMindFiles is always a subset of workspaceFiles.
 * - Before reading out files, it double-checks their existence by querying the file system.
 * - Proactively receives notifications about file changes that occur through VS Code,
 *   allowing for push updates to the webview rather than relying on pull requests.
 */
export class FileManager {
	private static instance: FileManager | null = null;

	private disposables: vscode.Disposable[] = [];
	private initializationPromise: Promise<void> | null = null;

	private workspaceFiles: vscode.Uri[] = [];
	private meltyMindFiles: Set<string> = new Set();

	constructor(
		private readonly _gitManager: GitManager = GitManager.getInstance()
	) {
		this.initializationPromise = this.initializeFileList();
		this.registerEventListeners();
	}

	public static getInstance(): FileManager {
		if (!FileManager.instance) {
			FileManager.instance = new FileManager();
		}
		return FileManager.instance;
	}

	public async loadMeltyMindFiles(relPaths: string[]) {
		this.meltyMindFiles = new Set(relPaths);
		webviewNotifier.sendNotification("updateMeltyMindFiles", {
			files: await this.getMeltyMindFilesRelative(),
		});
	}

	public dumpMeltyMindFiles(): string[] {
		return Array.from(this.meltyMindFiles);
	}

	private async initializeFileList(): Promise<void> {
		this.workspaceFiles = await vscode.workspace.findFiles(
			"**/*",
			config.getExcludesGlob()
		);
	}

	private registerEventListeners(): void {
		this.disposables.push(
			vscode.workspace.onDidCreateFiles(this.handleFilesCreated.bind(this)),
			vscode.workspace.onDidDeleteFiles(this.handleFilesDeleted.bind(this)),
			vscode.workspace.onDidRenameFiles(this.handleFilesRenamed.bind(this))
		);
	}

	private async handleFilesCreated(event: vscode.FileCreateEvent) {
		// add workspace files
		this.workspaceFiles = this.workspaceFiles.concat(event.files);

		webviewNotifier.sendNotification("updateWorkspaceFiles", {
			files: await this.getWorkspaceFilesRelative(),
		});
	}

	private async handleFilesDeleted(event: vscode.FileDeleteEvent) {
		// delete workspace files
		this.workspaceFiles = this.workspaceFiles.filter(
			(file) =>
				!event.files.some((deletedFile) => deletedFile.fsPath === file.fsPath)
		);

		// delete meltymind files
		event.files.forEach((deletedFile) => {
			const relPath = path.relative(this._gitManager.getMeltyRoot(), deletedFile.fsPath);
			this.meltyMindFiles.delete(relPath);
		});

		webviewNotifier.sendNotification("updateWorkspaceFiles", {
			files: await this.getWorkspaceFilesRelative(),
		});
		webviewNotifier.sendNotification("updateMeltyMindFiles", {
			files: await this.getMeltyMindFilesRelative(),
		});
	}

	private async handleFilesRenamed(event: vscode.FileRenameEvent) {
		// rename workspace files
		event.files.forEach(({ oldUri, newUri }) => {
			const index = this.workspaceFiles.findIndex(
				(file) => file.fsPath === oldUri.fsPath
			);
			if (index !== -1) {
				this.workspaceFiles[index] = newUri;
			}
		});

		// rename meltymind files
		event.files.forEach(({ oldUri, newUri }) => {
			const oldRelPath = path.relative(this._gitManager.getMeltyRoot(), oldUri.fsPath);
			const newRelPath = path.relative(this._gitManager.getMeltyRoot(), newUri.fsPath);
			if (this.meltyMindFiles.has(oldRelPath)) {
				this.meltyMindFiles.delete(oldRelPath);
				this.meltyMindFiles.add(newRelPath);
			}
		});
		webviewNotifier.sendNotification("updateWorkspaceFiles", {
			files: await this.getWorkspaceFilesRelative(),
		});
		webviewNotifier.sendNotification("updateMeltyMindFiles", {
			files: await this.getMeltyMindFilesRelative(),
		});
	}

	public async getWorkspaceFiles(): Promise<vscode.Uri[]> {
		await this.ensureInitialized();
		await this.pruneFiles();
		return [...this.workspaceFiles];
	}

	public async getWorkspaceFilesRelative(): Promise<string[]> {
		await this.ensureInitialized();
		await this.pruneFiles();
		return this.workspaceFiles.map((file) =>
			path.relative(this._gitManager.getMeltyRoot(), file.fsPath)
		);
	}

	public async getContextPaths(): Promise<ContextPaths> {
		await this.ensureInitialized();
		await this.pruneFiles();
		return {
			relativePaths: Array.from(this.meltyMindFiles),
			meltyRoot: this._gitManager.getMeltyRoot(),
		};
	}

	public async getMeltyMindFilesRelative(): Promise<string[]> {
		await this.ensureInitialized();
		await this.pruneFiles();
		return Array.from(this.meltyMindFiles);
	}

	public async addMeltyMindFile(relPath: string, notify: boolean = false) {
		// TODO: we should probably get rid of the synchronous return and always rely on the
		// notifier?
		const absPath = path.join(this._gitManager.getMeltyRoot(), relPath);

		// first, add to workspace files if needed
		// (we call this method on file creation)
		if (!this.workspaceFiles.find((file) => file.fsPath === absPath)) {
			this.workspaceFiles.push(vscode.Uri.file(absPath));
			webviewNotifier.sendNotification("updateWorkspaceFiles", {
				files: await this.getWorkspaceFilesRelative(),
			});
		}

		this.meltyMindFiles.add(relPath);
		if (notify) {
			webviewNotifier.sendNotification("updateMeltyMindFiles", {
				files: await this.getContextPaths().relativePaths,
			});
		}
	}

	public dropMeltyMindFile(relPath: string) {
		this.meltyMindFiles.delete(relPath);
		// this.outputChannel.appendLine(`Dropped file: ${relPath}`);
	}

	public async refreshFiles(): Promise<void> {
		this.initializationPromise = this.initializeFileList();
		await this.initializationPromise;
	}

	private async ensureInitialized(): Promise<void> {
		if (this.initializationPromise) {
			await this.initializationPromise;
		}
	}

	public dispose(): void {
		this.disposables.forEach((d) => d.dispose());
	}

	private async pruneFiles(): Promise<void> {
		const existingWorkspaceFiles: vscode.Uri[] = [];
		const existingMeltyMindFiles: Set<string> = new Set();

		for (const file of this.workspaceFiles) {
			try {
				await fs.access(file.fsPath);
				existingWorkspaceFiles.push(file);

				const relPath = path.relative(this._gitManager.getMeltyRoot(), file.fsPath);
				if (this.meltyMindFiles.has(relPath)) {
					existingMeltyMindFiles.add(relPath);
				}
			} catch {
				// File doesn't exist, don't add it to the lists
			}
		}

		this.workspaceFiles = existingWorkspaceFiles;
		this.meltyMindFiles = existingMeltyMindFiles;

		webviewNotifier.sendNotification("updateWorkspaceFiles", {
			files: this.workspaceFiles.map((file) =>
				path.relative(this._gitManager.getMeltyRoot(), file.fsPath)
			),
		});
		webviewNotifier.sendNotification("updateMeltyMindFiles", {
			files: Array.from(this.meltyMindFiles),
		});
	}
}
