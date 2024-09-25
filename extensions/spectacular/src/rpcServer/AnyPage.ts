import * as vscode from "vscode";
import { WebviewNotifier } from "../services/WebviewNotifier";
import posthog from "posthog-js";
import { ContextProvider } from 'services/ContextProvider';
import { ContextInitializer } from 'services/ContextInitializer';
import { AnyPageRpcMethod, MeltyContext, MeltyConfig } from "../types";
import * as config from "../util/config";

/**
 * Contains rpc handlers that can be called from any page.
 */
export class AnyPage {
	// TODO initialize this class in the usual dependency injection way?
	// private static instance: AnyPage | null = null;

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _contextInitializer: ContextInitializer = ContextInitializer.getInstance(),
		private readonly _webviewNotifier: WebviewNotifier = WebviewNotifier.getInstance()
	) {
		this._extensionContext.subscriptions.push(
			vscode.workspace.onDidChangeWorkspaceFolders((event) => {
				this._webviewNotifier.sendNotification("updateMeltyContextOrError", { contextOrError: this._contextInitializer.getMeltyContextOrError() });
			})
		);
	}

	// public static getInstance(): AnyPage {
	// 	if (!AnyPage.instance) {
	// 		AnyPage.instance = new AnyPage();
	// 	}
	// 	return AnyPage.instance;
	// }

	public async handleRPCCall(method: AnyPageRpcMethod, params: any): Promise<any> {
		switch (method) {
			case "openWorkspaceDialog":
				return await this.rpcOpenWorkspaceDialog();
			case "createGitRepository":
				return await this.rpcCreateGitRepository();
			case "createAndOpenWorkspace":
				return await this.rpcCreateAndOpenWorkspace();
			case "getMeltyContextError":
				return await this.rpcGetMeltyContextError();
			case "checkOnboardingComplete":
				return this.rpcCheckOnboardingComplete();
			case "setOnboardingComplete":
				return this.rpcSetOnboardingComplete();
			case "getVSCodeTheme":
				return this.rpcGetVSCodeTheme();
			case "getMeltyConfig":
				return this.rpcGetMeltyConfig();
			default:
				throw new Error(`Unknown RPC method: ${method}`);
		}
	}

	public rpcGetVSCodeTheme(): string {
		return vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';
	}

	private async rpcCreateAndOpenWorkspace(): Promise<boolean> {
		try {
			const homedir = require('os').homedir();
			const workspacePath = vscode.Uri.file(homedir + '/melty-workspace');

			// Create the directory
			await vscode.workspace.fs.createDirectory(workspacePath);

			// Open the new workspace in the current window without prompting
			const success = await vscode.commands.executeCommand('vscode.openFolder', workspacePath, {
				forceNewWindow: false,
				noRecentEntry: true
			});

			return success === undefined;
		} catch (error) {
			console.error("Failed to create and open workspace:", error);
			return false;
		}
	}

	private async rpcCheckOnboardingComplete(): Promise<boolean> {
		return this._extensionContext.globalState.get('onboardingComplete', false);
	}

	private async rpcSetOnboardingComplete(): Promise<void> {
		await this._extensionContext.globalState.update('onboardingComplete', true);
	}

	private async rpcOpenWorkspaceDialog(): Promise<boolean> {
		const result = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			openLabel: "Add to Workspace",
		});

		if (result && result[0]) {
			const newFolderUri = result[0];

			// // disabling because it caused a dialog prompting user to save the workspace
			// return vscode.workspace.updateWorkspaceFolders(
			// 	vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
			// 	0, // Number of folders to remove (0 in this case as we're adding)
			// 	{ uri: newFolderUri }
			// );

			const openResult: any = await vscode.commands.executeCommand('vscode.openFolder', newFolderUri, false);
			return openResult === undefined;
		} else {
			return false;
		}
	}

	private async rpcCreateGitRepository(): Promise<boolean> {
		const success = await this._contextInitializer.createRepository();
		if (success) {
			vscode.window.showInformationMessage("Git repository created");
			return true;
		} else {
			vscode.window.showErrorMessage(`Failed to create git repository`);
			return false;
		}
	}

	private async rpcGetMeltyContextError(): Promise<string> {
		const meltyContextOrError = this._contextInitializer.getMeltyContextOrError();
		if (!(meltyContextOrError instanceof String)) {
			// success!
			ContextProvider.initialize(meltyContextOrError as MeltyContext);
			return "";
		}
		return meltyContextOrError as string;
	}

	private async rpcGetMeltyConfig(): Promise<MeltyConfig> {
		return {
			debugMode: config.getDebugMode(),
		};
	}
}
