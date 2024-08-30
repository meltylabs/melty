import {
	Disposable,
	Webview,
	WebviewPanel,
	window,
	Uri,
	ViewColumn,
	WebviewViewProvider,
	WebviewView,
	WebviewViewResolveContext,
	CancellationToken,
} from "vscode";
import * as vscode from "vscode";
import { getUri, getNonce } from "../util/utils";
import { Conversation, TaskMode } from "../types";
import { MeltyExtension } from "../extension";
import * as utils from "../util/utils";
import { Task } from "../backend/tasks";
import * as config from "../util/config";
import { WebviewNotifier } from "../webviewNotifier";
import { FileManager } from "../fileManager";
import { RpcMethod } from "../types";
import { Coder } from "../assistants/coder";
import { Vanilla } from "../assistants/vanilla";
import posthog from "posthog-js";

/**
 * This class manages the state and behavior of HelloWorld webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering HelloWorld webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
export class HelloWorldPanel implements WebviewViewProvider {
	public static currentView: HelloWorldPanel | undefined;
	private _view?: WebviewView;
	private _disposables: Disposable[] = [];
	private fileManager?: FileManager;
	private todoCheckInterval: NodeJS.Timeout | null = null;

	private MeltyExtension: MeltyExtension;

	constructor(
		private readonly _extensionUri: Uri,
		MeltyExtension: MeltyExtension
	) {
		this.MeltyExtension = MeltyExtension;
	}

	public resolveWebviewView(webviewView: WebviewView) {
		console.log("Resolving WebviewView for ChatView");
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				Uri.joinPath(this._extensionUri, "out"),
				Uri.joinPath(this._extensionUri, "webview-ui/build"),
			],
		};

		webviewView.webview.html = this._getWebviewContent(webviewView.webview);

		this._setWebviewMessageListener(webviewView.webview);

		const webviewNotifier = WebviewNotifier.getInstance();
		webviewNotifier.setView(this._view);
		this.fileManager = new FileManager(this.MeltyExtension.meltyRoot!);
		this.MeltyExtension.pushSubscription(this.fileManager);

		// Start the todo check interval
		this.todoCheckInterval = setInterval(() => this.checkAndSendTodo(), 10000);
		this.MeltyExtension.pushSubscription(new vscode.Disposable(() => {
			if (this.todoCheckInterval) {
				clearInterval(this.todoCheckInterval);
			}
		}));

		console.log("success in resolveWebviewView!");
	}

	private checkAndSendTodo() {
		const todo = this.MeltyExtension.getCurrentTodo();
		if (todo) {
			this._view?.webview.postMessage({
				type: "updateTodo",
				todo: todo,
			});
		}
	}

	/**
	 * Defines and returns the HTML that should be rendered within the webview panel.
	 *
	 * @remarks This is also the place where references to the React webview build files
	 * are created and inserted into the webview HTML.
	 *
	 * @param webview A reference to the extension webview
	 * @param extensionUri The URI of the directory containing the extension
	 * @returns A template string literal containing the HTML that should be
	 * rendered within the webview panel
	 */
	private _getWebviewContent(webview: Webview) {
		// The CSS file from the React build output
		const stylesUri = getUri(webview, this._extensionUri, [
			"webview-ui",
			"build",
			"static",
			"css",
			"main.css",
		]);
		// The JS file from the React build output
		const scriptUri = getUri(webview, this._extensionUri, [
			"webview-ui",
			"build",
			"static",
			"js",
			"main.js",
		]);

		const nonce = getNonce();

		// Tip: Install the es6-string-html VS Code extension to enable code highlighting below
		return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https://*.posthog.com; style-src ${webview.cspSource}; script-src 'nonce-${nonce}' 'unsafe-inline' https://*.posthog.com; connect-src https://*.posthog.com;">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Melty</title>
        </head>
        <body>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <div id="root"></div>
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
	}

	/**
	 * Sets up an event listener to listen for messages passed from the webview context and
	 * executes code based on the message that is recieved.
	 *
	 * @param webview A reference to the extension webview
	 * @param context A reference to the extension context
	 */
	private _setWebviewMessageListener(webview: Webview) {
		webview.onDidReceiveMessage((message) => {
			if (message.type === "rpc") {
				console.log(
					`[RPC Server] RPC call for ${message.method
					} with params ${JSON.stringify(message.params)}`
				);
				this.handleRPCCall(message.method as RpcMethod, message.params)
					.then((result) => {
						console.log(
							`[RPC Server] sending RPC response for ${message.id} with result ${result}`
						);
						webview.postMessage({
							type: "rpcResponse",
							id: message.id,
							result,
						});
					})
					.catch((error) => {
						if (config.DEV_MODE) {
							throw error;
						}

						console.log(
							`[RPC Server] sending RPCresponse for ${message.id} with error ${error.message}`
						);
						webview.postMessage({
							type: "rpcResponse",
							id: message.id,
							error: error.message,
						});
					});
			}
		});
	}

	private async notifyWebviewOfChatError(taskId: string, message: string) {
		const task = await this.MeltyExtension.getOrInitTask(
			taskId,
			this.fileManager
		);

		task.addErrorJoule(message);

		await WebviewNotifier.getInstance().sendNotification("updateTask", {
			task: task.serialize(),
		});
	}

	private async handleRPCCall(method: RpcMethod, params: any): Promise<any> {
		try {
			switch (method) {
				case "loadTask":
					return await this.rpcLoadTask(params.taskId);
				case "listMeltyFiles":
					return await this.rpcListMeltyFiles();
				case "listWorkspaceFiles":
					return await this.rpcListWorkspaceFiles();
				case "addMeltyFile":
					return await this.rpcAddMeltyFile(params.filePath);
				case "dropMeltyFile":
					return await this.rpcDropMeltyFile(params.filePath);
				case "undoLatestCommit":
					return await this.rpcUndoLatestCommit(params.commitId);
				case "getLatestCommit":
					return await this.rpcGetLatestCommit();
				case "chatMessage":
					return await this.rpcChatMessage(params.text, params.taskId);
				case "createAndSwitchToTask":
					return await this.rpcCreateAndSwitchToTask(
						params.name,
						params.taskMode,
						params.files
					);
				case "listTasks":
					return this.rpcListTasks();
				case "switchTask":
					return await this.rpcSwitchTask(params.taskId);
				case "createPullRequest":
					return await this.rpcCreatePullRequest();
				case "deleteTask":
					return await this.rpcDeleteTask(params.taskId);
				case "getGitConfigErrors":
					return await this.rpcGetGitConfigErrors();
				case "getAssistantDescription":
					return await this.rpcGetAssistantDescription(params.assistantType);
				case "getVSCodeTheme":
					return this.rpcGetVSCodeTheme();
				default:
					throw new Error(`Unknown RPC method: ${method}`);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			if (
				errorMessage === "Cannot read properties of null (reading 'repository')"
			) {
				vscode.window.showErrorMessage("Melty didn't see a git repo in your root directory. Create one?");
			} else {
				vscode.window.showErrorMessage(
					`Melty internal error: ${errorMessage}. Please try again.`
				);
			}

			if (method === "chatMessage") {
				await this.notifyWebviewOfChatError(params.taskId, errorMessage);
				await WebviewNotifier.getInstance().resetStatusMessage();
			}

			const result = posthog.capture("melty_errored", {
				type: "rpc_error",
				errorMessage: errorMessage,
				context: JSON.stringify({ ...params, rpcMethod: method }),
			});
			console.log("posthog event captured!", result);

			throw error;
		}
	}

	private async rpcGetAssistantDescription(
		taskMode: TaskMode
	): Promise<string> {
		switch (taskMode) {
			case "coder":
				return Coder.description;
			case "vanilla":
				return Vanilla.description;
			default:
				throw new Error(`Unknown assistant type: ${taskMode}`);
		}
	}

	private async rpcLoadTask(taskId: string): Promise<Task> {
		const task = this.MeltyExtension.getTask(taskId);
		return Promise.resolve(task.serialize());
	}

	private async rpcListMeltyFiles(): Promise<string[]> {
		const meltyMindFilePaths = this.fileManager!.getMeltyMindFilesRelative();
		return Promise.resolve(meltyMindFilePaths);
	}

	private async rpcListWorkspaceFiles(): Promise<string[]> {
		const workspaceFilePaths =
			await this.fileManager!.getWorkspaceFilesRelative();
		return workspaceFilePaths;
	}

	private async rpcAddMeltyFile(filePath: string): Promise<string[]> {
		await this.fileManager!.addMeltyMindFile(filePath, false);
		vscode.window.showInformationMessage(`Added ${filePath} to Melty's Mind`);
		return this.fileManager!.getMeltyMindFilesRelative();
	}

	private async rpcDropMeltyFile(filePath: string): Promise<string[]> {
		this.fileManager!.dropMeltyMindFile(filePath);
		vscode.window.showInformationMessage(
			`Removed ${filePath} from Melty's Mind`
		);
		return await this.fileManager!.getMeltyMindFilesRelative();
	}

	private async rpcCreateAndSwitchToTask(
		name: string,
		taskMode: TaskMode,
		files: string[]
	): Promise<string> {
		const newTaskId = await this.MeltyExtension.createNewTask(
			name,
			taskMode,
			files
		);
		await this.switchTask(newTaskId);
		return newTaskId;
	}

	private rpcListTasks(): Task[] {
		return this.MeltyExtension.listTasks();
	}

	private async rpcCreatePullRequest(): Promise<void> {
		await this.MeltyExtension.createPullRequest();
	}

	private async rpcDeleteTask(taskId: string): Promise<void> {
		await this.MeltyExtension.deleteTask(taskId);
	}

	private async rpcGetGitConfigErrors(): Promise<string> {
		return this.MeltyExtension.getGitConfigErrors();
	}

	private async rpcGetLatestCommit(): Promise<string | null> {
		return await this.MeltyExtension.getLatestCommitHash();
	}

	private async rpcUndoLatestCommit(commitId: string): Promise<void> {
		await this.MeltyExtension.undoLastCommit(commitId);
	}

	private async rpcSwitchTask(taskId: string): Promise<void> {
		await this.switchTask(taskId);
	}

	private rpcGetVSCodeTheme(): string {
		return vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';
	}

	private async rpcChatMessage(text: string, taskId: string): Promise<void> {
		const webviewNotifier = WebviewNotifier.getInstance();
		webviewNotifier.updateStatusMessage("Starting up");
		const task = await this.MeltyExtension.getOrInitTask(
			taskId,
			this.fileManager
		);

		// human response
		await task.respondHuman(text);
		webviewNotifier.sendNotification("updateTask", {
			task: task.serialize(),
		});

		// bot response
		const processPartial = (partialConversation: Conversation) => {
			// copy task
			const serialTask = task.serialize();
			serialTask.conversation = partialConversation;
			webviewNotifier.sendNotification("updateTask", {
				task: serialTask,
			});
		};
		await task.respondBot(processPartial);

		webviewNotifier.sendNotification("updateTask", {
			task: task.serialize(),
		});
		webviewNotifier.resetStatusMessage();
	}

	private async switchTask(taskId: string): Promise<void> {
		const oldTask = await this.MeltyExtension.getCurrentTask(this.fileManager);
		if (oldTask && this.fileManager) {
			const meltyMindFiles =
				await this.fileManager!.getMeltyMindFilesRelative();
			if (meltyMindFiles) {
				oldTask.savedMeltyMindFiles = meltyMindFiles;
			}
		}

		await this.MeltyExtension.switchToTask(taskId);
		const newTask = (await this.MeltyExtension.getCurrentTask(
			this.fileManager
		))!;
		await newTask.init(this.fileManager!);

		// load meltyMindFiles into new task
		this.fileManager?.loadMeltyMindFiles(newTask.savedMeltyMindFiles);
	}

	/**
	 * Run a terminal command
	 * @param command The command to run
	 */
	private runTerminalCommand(command: string) {
		const terminal = vscode.window.activeTerminal;
		if (terminal) {
			terminal.sendText(command);

			// You might want to set up an event listener for terminal data
			vscode.window.onDidChangeActiveTerminal((terminal) => {
				if (terminal) {
					// Handle terminal change
					console.log("Terminal changed");
				}
			});
		} else {
			vscode.window.showInformationMessage("No active terminal");
		}
	}
}
