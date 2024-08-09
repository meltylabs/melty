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
    webview.onDidReceiveMessage(
      async (message: any) => {
        const command = message.command;
        const meltyMindFilePaths = this.MeltyExtension.getMeltyMindFilePaths();

        switch (command) {
          case "hello":
            // Code that should run in response to the hello message command
            window.showInformationMessage(message.text);
            return;
          case "loadTask":
            console.log(`loadTask`);
            let taskId = message.taskId;
            const task = this.MeltyExtension.getTask(taskId);
            this._view?.webview.postMessage({
              command: "loadTask",
              task: utils.serializableTask(task),
            });
            return;
          case "listMeltyFiles":
            console.log(
              `listFiles: ${meltyMindFilePaths.length} melty file paths`
            );
            this._view?.webview.postMessage({
              command: "listMeltyFiles",
              meltyMindFilePaths: meltyMindFilePaths,
            });
            return;
          case "listWorkspaceFiles":
            const workspaceFilePaths =
              await this.MeltyExtension.getWorkspaceFilePaths();
            this._view?.webview.postMessage({
              command: "listWorkspaceFiles",
              workspaceFilePaths: workspaceFilePaths,
            });
            return;
          case "resetTask":
          // this.MeltyExtension.resetTask();
          // this._panel.webview.postMessage({
          //   command: "loadConversation",
          //   conversation: this.MeltyExtension.getConversation(),
          // });
          // return;
          case "openFileInEditor":
            this.MeltyExtension.openFileInEditor(message.filePath);
            return;
          case "createPR":
            await this.MeltyExtension.createPullRequest();
            break;

          case "addMeltyFile":
            console.log(`addFile: ${message.filePath}`);
            this.MeltyExtension.addMeltyMindFilePath(message.filePath);
            this._view?.webview.postMessage({
              command: "listMeltyFiles",
              meltyMindFilePaths: this.MeltyExtension.getMeltyMindFilePaths(),
            });
            vscode.window.showInformationMessage(
              `Added ${message.filePath} to Melty's Mind`
            );
            return;
          case "dropMeltyFile":
            console.log(`dropFile: ${message.filePath}`);
            this.MeltyExtension.dropMeltyMindFilePath(message.filePath);
            console.log(
              "sending back meltyMindFilePaths: ",
              this.MeltyExtension.getMeltyMindFilePaths()
            );
            vscode.window.showInformationMessage(
              `Removed ${message.filePath} from Melty's Mind`
            );
            this._view?.webview.postMessage({
              command: "listMeltyFiles",
              meltyMindFilePaths: this.MeltyExtension.getMeltyMindFilePaths(),
            });
            return;
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
            return;
          case "ask":
            await this.handleAskCode(message.text, "ask");
            return;

          case "code":
            await this.handleAskCode(message.text, "code");
            return;

          case "createNewTask":
            const newTaskId = await this.MeltyExtension.createNewTask(
              message.name
            );
            this._view?.webview.postMessage({
              command: "taskCreated",
              taskId: newTaskId,
            });
            return;

          case "listTasks":
            const tasks = this.MeltyExtension.listTasks();
            this._view?.webview.postMessage({
              command: "listTasks",
              tasks: tasks,
            });
            return;

          case "switchTask":
            await this.MeltyExtension.switchToTask(message.taskId);
            const newTask = await this.MeltyExtension.getCurrentTask();
            console.log(`switched to ${newTask.id}`);

            // kick this off (todo: make sure it completes in time?)
            newTask.init();
            // this._panel.webview.postMessage({
            //   command: "taskSwitched",
            //   taskId: message.taskId,
            // });
            return;
        }
      },
      undefined,
      this._disposables
    );
  }

  private async handleAskCode(text: string, mode: "ask" | "code") {
    const meltyMindFilePaths = this.MeltyExtension.getMeltyMindFilePaths();
    const task = await this.MeltyExtension.getCurrentTask();

    // human response
    await task.respondHuman(text);
    this._view?.webview.postMessage({
      command: "loadTask",
      task: utils.serializableTask(task),
    });

    // bot response
    const processPartial = (partialConversation: Conversation) => {
      // copy task
      const partialTask = { ...task };
      partialTask.conversation = partialConversation;
      this._view?.webview.postMessage({
        command: "loadTask",
        task: utils.serializableTask(partialTask as Task),
      });
    };

    await task.respondBot(
      meltyMindFilePaths, // TODO are we sending the right files here? @soybean
      mode,
      processPartial
    );
    // Send the response back to the webview
    this._view?.webview.postMessage({
      command: "loadTask",
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
}
