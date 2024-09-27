import vscode from 'vscode';
import { MeltyContext } from '../types';

/**
 * Helps with creating the MeltyContext
 * Walks through errors when dependencies aren't available
 */
export class ContextInitializer {
	private static instance: ContextInitializer | null = null;

	private initializationPromise: Promise<void>;
	private resolveInitializationPromise!: () => void;

	public static getInstance(): ContextInitializer {
		if (!ContextInitializer.instance) {
			ContextInitializer.instance = new ContextInitializer();
		}
		return ContextInitializer.instance;
	}

	private constructor() {
		this.initializationPromise = new Promise((resolve) => {
			this.resolveInitializationPromise = resolve;
		});
		this.initializeWhenReady();
	}

	private async waitForWorkspace(): Promise<void> {
		if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
			return;
		}

		return new Promise((resolve) => {
			const disposable = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
				if (event.added.length > 0) {
					disposable.dispose();
					resolve();
				}
			});
		});
	}

	private async waitForGitExtension(): Promise<void> {
		if (vscode.extensions.getExtension('vscode.git')) {
			return;
		}

		return new Promise((resolve) => {
			const disposable = vscode.extensions.onDidChange(() => {
				if (vscode.extensions.getExtension('vscode.git')) {
					disposable.dispose();
					resolve();
				}
			});
		});
	}

	private async initializeWhenReady(): Promise<void> {
		await this.waitForWorkspace();
		await this.waitForGitExtension();
		this.resolveInitializationPromise();
	}

	public getMeltyContextOrError(): MeltyContext | string {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			// this string is parsed on frontend to decide whether to show the workspace folder dialog
			return "No workspace folder found. Open a workspace folder.";
		}

		const workspaceRoot = workspaceFolders[0].uri.fsPath;
		if (!workspaceRoot) {
			return "Workspace folder has no root path. This should not happen.";
		}

		const gitExtension = vscode.extensions.getExtension('vscode.git');
		if (!gitExtension) {
			return "Git extension not found. Try reloading the window.";
		}
		const gitApi = gitExtension.exports.getAPI(1);
		if (!gitApi) {
			return "Git API not found. Try reloading the window.";
		}

		const repositories = gitApi.repositories;
		if (!repositories.length) {
			// this string is parsed on frontend to decide whether to show the create repo button
			return "No git repositories found. Run `git init` in the root workspace folder.";
		}

		// Find the repository that matches the workspace root
		const repo = repositories.find(
			(r: any) => r.rootUri.fsPath === workspaceRoot
		);
		if (!repo) {
			// this string is parsed on frontend to decide whether to show the create repo button
			return "No git repository found at workspace root. Run `git init` in the root workspace folder.";
		}

		// hooray! no issues
		this.resolveInitializationPromise();

		return {
			workspaceRoot,
			meltyRoot: vscode.workspace.getConfiguration().get('melty.root') || '/',
			gitRepo: repo
		};
	}

	public async createRepository(): Promise<boolean> {
		try {
			// start hacky copy paste
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders) {
				// this string is parsed on frontend to decide whether to show the workspace folder dialog
				throw new Error();
			}

			const workspaceRoot = workspaceFolders[0].uri.fsPath;
			if (!workspaceRoot) {
				throw new Error();
			}

			const gitExtension = vscode.extensions.getExtension('vscode.git');
			if (!gitExtension) {
				throw new Error();
			}
			const gitApi = gitExtension.exports.getAPI(1);
			if (!gitApi) {
				throw new Error();
			}
			// end hacky copy paste

			const _repo = await gitApi.init(
				vscode.Uri.parse(workspaceRoot)
			);
			// for now, we throw out _repo and let a call to init() find it again
			return true;
		} catch (error) {
			console.error('Error creating git repository:', error);
			return false;
		}
	}
}
