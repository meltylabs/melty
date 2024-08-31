import * as vscode from "vscode";
import { HelloWorldPanel } from "./HelloWorldPanel";
import { generateTodoFromCurrentPR } from "./todoGenerator";
import { GitManager } from "./services/GitManager";

import posthog from "posthog-js";
import { TaskManager } from './services/TaskManager';

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
