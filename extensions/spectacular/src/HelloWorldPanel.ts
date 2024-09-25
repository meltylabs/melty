import {
	Webview,
	Uri,
	WebviewViewProvider,
	WebviewView,
} from "vscode";
import * as vscode from "vscode";
import { getUri, getNonce } from "./util/utils";
import { WebviewNotifier } from "./services/WebviewNotifier";
import { RpcMethod, ANY_PAGE_RPC_METHODS, TASKS_PAGE_RPC_METHODS, PAGE_NAVIGATION_RPC_METHODS, AnyPageRpcMethod, TasksPageRpcMethod, PageNavigationRpcMethod } from "./types";
import posthog from "posthog-js";

import { AnyPage } from './rpcServer/AnyPage';
import { TasksPage } from './rpcServer/TasksPage';

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

	private anyPage: AnyPage;
	private tasksPage: TasksPage | null = null;

	constructor(
		private readonly _extensionUri: Uri,
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _webviewNotifier: WebviewNotifier = WebviewNotifier.getInstance()
	) {
		this.anyPage = new AnyPage(this._extensionContext);
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

		this._webviewNotifier.setView(this._view);

		console.log("success in resolveWebviewView!");
	}

	public async deactivate() {
		await this.tasksPage?.deactivateTasks();
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
			"assets",
			"main.css",
		]);
		// The JS file from the React build output
		const scriptUri = getUri(webview, this._extensionUri, [
			"webview-ui",
			"build",
			"assets",
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
							`[RPC Server] sending RPC response for ${message.id} (${message.method})`
						);
						webview.postMessage({
							type: "rpcResponse",
							method: message.method,
							id: message.id,
							result,
						}).then((res) => { console.log("postMessage result (could be an error)", res); });
					})
					.catch((error) => {
						console.log(
							`[RPC Server] sending RPCresponse for ${message.id} with error ${error.message}`
						);
						webview.postMessage({
							type: "rpcResponse",
							method: message.method,
							id: message.id,
							error: error.message,
						});
						vscode.window.showErrorMessage(error); // for dev; remove this in prod
					});
			}
		});
	}

	private async handleRPCCall(method: RpcMethod, params: any): Promise<any> {
		try {
			if (PAGE_NAVIGATION_RPC_METHODS.includes(method as any)) {
				switch (method as PageNavigationRpcMethod) {
					case "goToTasksPage":
						if (!this.tasksPage) {
							this.tasksPage = TasksPage.getInstance();
						}
						return;
					default:
						throw new Error(`Unknown page navigation method: ${method}`);
				}
			} else if (TASKS_PAGE_RPC_METHODS.includes(method as any)) {
				if (!this.tasksPage) {
					throw new Error("Illegal state: tasksPage not initialized");
				}
				return this.tasksPage.handleRPCCall(method as TasksPageRpcMethod, params);
			} else if (ANY_PAGE_RPC_METHODS.includes(method as any)) {
				return this.anyPage.handleRPCCall(method as AnyPageRpcMethod, params);
			} else {
				throw new Error(`Unknown RPC method: ${method}`);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (
				errorMessage === "Cannot read properties of null (reading 'repository')"
			) {
				vscode.window.showErrorMessage("Melty didn't see a git repo in your root directory. Create one?");
			} else {
				vscode.window.showErrorMessage(
					`Melty internal error: ${errorMessage}. Please try again.`
				);
			}

			const result = posthog.capture("melty_errored", {
				type: "rpc_error",
				errorMessage: errorMessage,
				context: JSON.stringify({ ...params, rpcMethod: method }),
			});
			console.log("posthog event captured!", result);
		}
	}
}
