import * as vscode from "vscode";
import { HelloWorldPanel } from "./HelloWorldPanel";
import { generateTodoFromCurrentPR } from "./todoGenerator";
import { GitManager } from "./services/GitManager";

import posthog from "posthog-js";
import { TaskManager } from './services/TaskManager';
import { exec } from 'child_process';

const COPY_MELTY_SETTINGS_SCRIPT_URL = 'https://raw.githubusercontent.com/meltylabs/melty/main/scripts/copy_settings.sh';
const COPY_MELTY_EXTENSIONS_SCRIPT_URL = 'https://raw.githubusercontent.com/meltylabs/melty/main/scripts/copy_extensions.sh';

export class MeltyExtension {
	private outputChannel: vscode.OutputChannel;

	private currentBranch: string | null = null;
	private branchCheckInterval: NodeJS.Timeout | null = null;
	private currentTodo: string | null = null;

	constructor(
		private context: vscode.ExtensionContext,
		outputChannel: vscode.OutputChannel,
		private readonly _gitManager: GitManager = GitManager.getInstance(),
		private readonly _taskManager: TaskManager = TaskManager.getInstance()
	) {
		this.outputChannel = outputChannel;
	}

	public pushSubscription(subscription: vscode.Disposable) {
		this.context.subscriptions.push(subscription);
	}

	async activate() {
		outputChannel.appendLine("Melty activation started");

		this._taskManager.loadTasks();

		// Start the branch check interval
		// this.branchCheckInterval = setInterval(
		// 	() => this.checkBranchChange(),
		// 	3000
		// );
		// this.context.subscriptions.push(
		// 	new vscode.Disposable(() => {
		// 		if (this.branchCheckInterval) {
		// 			clearInterval(this.branchCheckInterval);
		// 		}
		// 	})
		// );

		// Get the initial branch and generate initial todo
		// this.currentBranch = this._gitManager.getCurrentBranch();
		// await this.checkBranchChange();
	}

	private async checkBranchChange(): Promise<void> {
		const newBranch = this._gitManager.getCurrentBranch();
		if (newBranch !== this.currentBranch) {
			this.currentBranch = newBranch;
			if (newBranch) {
				this.currentTodo = await generateTodoFromCurrentPR();
			}
		}
	}

	public getCurrentTodo(): string | null {
		return this.currentTodo;
	}

	async deactivate(): Promise<void> {
		// The extension instance will be garbage collected, so we don't need to call deactivate explicitly
		const activeTaskId = this._taskManager.getActiveTaskId();
		if (activeTaskId) {
			await this._taskManager.deactivate(activeTaskId);
		}
		await this._taskManager.dumpTasks();

		if (this.branchCheckInterval) {
			clearInterval(this.branchCheckInterval);
		}
	}

	public async checkOnboardingComplete(): Promise<boolean> {
		return this.context.globalState.get('onboardingComplete', false);
	}

	public async setOnboardingComplete(): Promise<void> {
		await this.context.globalState.update('onboardingComplete', true);
	}

	async copySettings(): Promise<void> {
		// progress bar
		const progress = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		progress.text = 'Copying VS Code settings...';
		progress.show();

		// copy settings
		exec(`curl ${COPY_MELTY_SETTINGS_SCRIPT_URL} -L | bash`, (error, stdout, _stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`Error copying settings: ${error.message}`);
				return;
			}

			// hide progress bar
			progress.hide();

			// show success message
			vscode.window.showInformationMessage('VS Code settings copied successfully!');
			this.outputChannel.appendLine(stdout);
		});
	}

	async copyExtensions(): Promise<void> {
		// progress bar
		const progress = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		progress.text = 'Copying VS Code extensions...';
		progress.show();

		// copy extensions
		exec(`curl ${COPY_MELTY_EXTENSIONS_SCRIPT_URL} -L | bash`, (error, stdout, _stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`Error copying extensions: ${error.message}`);
				return;
			}

			// hide progress bar
			progress.hide();

			// show success message
			vscode.window.showInformationMessage('VS Code extensions copied successfully!');
			this.outputChannel.appendLine(stdout);
		});
	}
}

let outputChannel: vscode.OutputChannel;
let extension: MeltyExtension;

export function activate(context: vscode.ExtensionContext) {
	console.log("Activating Melty extension");
	outputChannel = vscode.window.createOutputChannel("Melty");
	outputChannel.appendLine("Activating Melty extension");

	extension = new MeltyExtension(context, outputChannel);
	extension.activate();

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			"melty.magicWebview",
			new HelloWorldPanel(context.extensionUri, extension)
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('melty.copySettings', () => extension.copySettings())
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('melty.copyExtensions', () => extension.copyExtensions())
	);

	// posthog init for backend
	posthog.init("phc_tvdsIv2ZDXVeJfYm0GTEBFwaPtdmWRa2cNVGCg18Qt6", {
		api_host: "https://us.i.posthog.com",
		person_profiles: "identified_only",
	});

	outputChannel.appendLine("Melty extension activated");
	console.log("Melty extension activated");
}

export async function deactivate(): Promise<void> {
	await extension.deactivate();
	console.log("Melty extension deactivated");
}
