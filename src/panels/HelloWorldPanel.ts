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
import { Conversation, AssistantType } from "../types";
import { MeltyExtension } from "../extension";
import * as utils from "../util/utils";
import { Task } from "../backend/tasks";
import * as config from "../util/config";
import { BridgeToWebview } from "../bridgeToWebview";
import { FileManager } from "../fileManager";

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
  private bridgeToWebview?: BridgeToWebview;
  private fileManager?: FileManager;

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

    this.bridgeToWebview = new BridgeToWebview(this._view);
    this.fileManager = new FileManager(
      this.bridgeToWebview,
      this.MeltyExtension.meltyRoot!
    );
    this.MeltyExtension.pushSubscription(this.fileManager);
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

          <script>
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId setPersonProperties".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('phc_tvdsIv2ZDXVeJfYm0GTEBFwaPtdmWRa2cNVGCg18Qt6',{api_host:'https://us.i.posthog.com', person_profiles: 'identified_only' // or 'always' to create profiles for anonymous users as well
        })
</script>
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
        const meltyMindFilePaths =
          this.fileManager!.getMeltyMindFilesRelative();
        return Promise.resolve(meltyMindFilePaths);
      case "listWorkspaceFiles":
        const workspaceFilePaths =
          await this.fileManager!.getWorkspaceFilesRelative();
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
        this.fileManager!.addMeltyMindFile(params.filePath, false);
        vscode.window.showInformationMessage(
          `Added ${params.filePath} to Melty's Mind`
        );
        return Promise.resolve(this.fileManager!.getMeltyMindFilesRelative());
      case "dropMeltyFile":
        this.fileManager!.dropMeltyMindFile(params.filePath);
        vscode.window.showInformationMessage(
          `Removed ${params.filePath} from Melty's Mind`
        );
        return Promise.resolve(this.fileManager!.getMeltyMindFilesRelative());
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
        this.handleAskCode(params.text, params.assistantType);
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

      case "deleteTask":
        this.MeltyExtension.deleteTask(params.taskId);
        return Promise.resolve(null);

      case "resetToOriginMain":
        return this.resetToOriginMain();
    }
  }

  private async handleAskCode(text: string, assistantType: AssistantType) {
    const task = await this.MeltyExtension.getCurrentTask();
    task.setFileManager(this.fileManager!);

    // human response

    try {
      await task.respondHuman(assistantType, text);
      this.bridgeToWebview?.sendNotification("updateTask", {
        task: utils.serializableTask(task),
      });
    } catch (error) {
      console.error("Error in respondHuman:", error);
      if (
        (error as Error).message ==
        "Cannot read properties of null (reading 'repository')"
      ) {
        vscode.window.showErrorMessage("Melty does not see a git repository.");
      } else {
        vscode.window.showErrorMessage(error as string);
      }
    }

    // bot response
    const processPartial = (partialConversation: Conversation) => {
      // copy task
      const partialTask = { ...task } as Task;
      partialTask.conversation = partialConversation;
      this.bridgeToWebview?.sendNotification("updateTask", {
        task: utils.serializableTask(partialTask),
      });
    };

    await task.respondBot(assistantType, processPartial);
    this.bridgeToWebview?.sendNotification("updateTask", {
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
   * Reset the current task to the origin/main branch.
   */
  private async resetToOriginMain(): Promise<string> {
    try {
      const task = await this.MeltyExtension.getCurrentTask();
      if (!task.gitRepo) {
        throw new Error("No Git repository associated with the current task.");
      }

      // Fetch the latest changes from the remote
      await task.gitRepo.fetch("origin");

      // Reset the local branch to origin/main
      await task.gitRepo.reset("origin/main", true);

      // Refresh the file system
      await vscode.commands.executeCommand(
        "workbench.files.action.refreshFilesExplorer"
      );

      return "Successfully reset to origin/main";
    } catch (error) {
      console.error("Error resetting to origin/main:", error);
      throw new Error(`Failed to reset to origin/main: ${error.message}`);
    }
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
