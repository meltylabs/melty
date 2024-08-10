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
import { Conversation } from "../types";
import { MeltyExtension } from "../extension";
import * as utils from "../util/utils";
import { Task } from "../backend/tasks";
import * as config from "../util/config";

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

    console.log("success in resolveWebviewView!");
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
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
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
        this.handleRPCCall(message.method, message.params)
          .then((result) => {
            console.log(
              `[HelloWorldPanel] sending RPC response for ${message.id} with result ${result}`
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
              `[HelloWorldPanel] sending RPCresponse for ${message.id} with error ${error.message}`
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

  private async handleRPCCall(method: string, params: any): Promise<any> {
    console.log(
      `[HelloWorldPanel] RPC call for ${method} with params ${JSON.stringify(
        params
      )}`
    );
    switch (method) {
      case "loadTask":
        console.log(`loadTask`);
        let taskId = params.taskId;
        const task = this.MeltyExtension.getTask(taskId);
        return Promise.resolve(utils.serializableTask(task));
      case "listMeltyFiles":
        const meltyMindFilePaths = this.MeltyExtension.getMeltyMindFilePaths();
        return Promise.resolve(meltyMindFilePaths);
      case "listWorkspaceFiles":
        const workspaceFilePaths =
          await this.MeltyExtension.getWorkspaceFilePaths();
        return Promise.resolve(workspaceFilePaths);
      case "resetTask":
        // this.MeltyExtension.resetTask();
        // this._panel.webview.postMessage({
        //   command: "loadConversation",
        //   conversation: this.MeltyExtension.getConversation(),
        // });
        // return;
        throw new Error("Not implemented");
        return;
      case "openFileInEditor":
        this.MeltyExtension.openFileInEditor(params.filePath);
        return Promise.resolve(null);
      case "addMeltyFile":
        this.MeltyExtension.addMeltyMindFilePath(params.filePath);
        vscode.window.showInformationMessage(
          `Added ${params.filePath} to Melty's Mind`
        );
        const meltyMindFilePaths2 = this.MeltyExtension.getMeltyMindFilePaths();
        return Promise.resolve(meltyMindFilePaths2);
      case "dropMeltyFile":
        this.MeltyExtension.dropMeltyMindFilePath(params.filePath);
        vscode.window.showInformationMessage(
          `Removed ${params.filePath} from Melty's Mind`
        );
        const meltyMindFilePaths3 = this.MeltyExtension.getMeltyMindFilePaths();
        return Promise.resolve(meltyMindFilePaths3);
      case "undo":
        // todo update implementation

        // await this.undoLatestCommit();
        // const repo = this.MeltyExtension.getRepository();
        // await repo.status();

        // const latestCommit = repo.state.HEAD?.commit;
        // const latestCommitMessage = await repo.getCommit(latestCommit);
        // const message = `Undone commit: ${latestCommit}\nMessage: ${latestCommitMessage.message}`;
        // vscode.window.showInformationMessage(message);
        // this._panel.webview.postMessage({
        //   command: "confirmedUndo",
        //   text: {
        //     sender: "user",
        //     message: message,
        //   },
        // });
        // return;
        throw new Error("Not implemented");
        return;
      case "chatMessage":
        this.handleAskCode(params.text, params.mode);
        return Promise.resolve(null);
      case "createNewTask":
        const newTaskId = await this.MeltyExtension.createNewTask(params.name);
        return Promise.resolve(newTaskId);

      case "listTasks":
        const tasks = this.MeltyExtension.listTasks();
        return Promise.resolve(tasks);

      case "switchTask":
        await this.MeltyExtension.switchToTask(params.taskId);
        const newTask = await this.MeltyExtension.getCurrentTask();
        await newTask.init();
        return Promise.resolve(utils.serializableTask(newTask));

      case "createPullRequest":
        this.MeltyExtension.createPullRequest();
        return Promise.resolve(null);
    }
  }

  private async handleAskCode(text: string, mode: "ask" | "code") {
    const meltyMindFilePaths = this.MeltyExtension.getMeltyMindFilePaths();
    const task = await this.MeltyExtension.getCurrentTask();

    // human response
    await task.respondHuman(text);
    this.sendNotificationToWebview("updateTask", {
      task: utils.serializableTask(task),
    });

    // bot response
    const processPartial = (partialConversation: Conversation) => {
      // copy task
      const partialTask = { ...task } as Task;
      partialTask.conversation = partialConversation;
      this.sendNotificationToWebview("updateTask", {
        task: utils.serializableTask(partialTask),
      });
    };

    await task.respondBot(meltyMindFilePaths, mode, processPartial);
    this.sendNotificationToWebview("updateTask", {
      task: utils.serializableTask(task),
    });
  }

  /**
   * Undo the latest commit.
   *
   * TODO: confirm with dice we want to do this
   */
  private async undoLatestCommit(): Promise<void> {
    // todo update implementation
    // const repo = this.MeltyExtension.getRepository();
    // await repo.status();
    // await repo.reset("HEAD~1", false);
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

  private sendNotificationToWebview(notificationType: string, params: any) {
    console.log(
      `[HelloWorldPanel] sending notification to webview: ${notificationType}`
    );
    this._view?.webview.postMessage({
      type: "notification",
      notificationType: notificationType,
      ...params,
    });
  }
}
