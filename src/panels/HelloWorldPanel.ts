import {
  Disposable,
  Webview,
  WebviewPanel,
  window,
  Uri,
  ViewColumn,
} from "vscode";
import * as vscode from "vscode";
import { getUri } from "../util/getUri";
import { getNonce } from "../util/getNonce";
import { Joule } from "../types";
import * as joules from "../backend/joules";
import { SpectacleExtension } from "../extension";

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
export class HelloWorldPanel {
  public static currentPanel: HelloWorldPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];

  private spectacleExtension: SpectacleExtension;

  /**
   * The HelloWorldPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(
    panel: WebviewPanel,
    extensionUri: Uri,
    spectacleExtension: SpectacleExtension
  ) {
    this._panel = panel;

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri
    );

    this.spectacleExtension = spectacleExtension;

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   */
  public static render(
    extensionUri: Uri,
    spectacleExtension: SpectacleExtension
  ) {
    if (HelloWorldPanel.currentPanel) {
      // If the webview panel already exists reveal it
      HelloWorldPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        "showMelty",
        // Panel title
        "Melty",
        // The editor column the panel should be displayed in
        ViewColumn.One,
        // Extra panel configurations
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` and `webview-ui/build` directories
          localResourceRoots: [
            Uri.joinPath(extensionUri, "out"),
            Uri.joinPath(extensionUri, "webview-ui/build"),
          ],
        }
      );

      HelloWorldPanel.currentPanel = new HelloWorldPanel(
        panel,
        extensionUri,
        spectacleExtension
      );
    }
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    HelloWorldPanel.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
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
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, [
      "webview-ui",
      "build",
      "static",
      "css",
      "main.css",
    ]);
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, [
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
        // init repository
        await this.spectacleExtension.initRepository();

        const command = message.command;
        const text = message.text;
        const filePath = message.filePath; // optional param for addFile and dropFile
        let meltyFilePaths = this.spectacleExtension.getMeltyFilePaths();

        switch (command) {
          case "hello":
            // Code that should run in response to the hello message command
            window.showInformationMessage(text);
            return;
          case "loadConversation":
            console.log(`loadConversation`);
            const conversation = this.spectacleExtension.getConversation();
            this._panel.webview.postMessage({
              command: "loadConversation",
              conversation: conversation,
            });
            return;
          case "listMeltyFiles":
            console.log(`listFiles: ${meltyFilePaths.length} melty file paths`);
            this._panel.webview.postMessage({
              command: "listMeltyFiles",
              meltyFilePaths: meltyFilePaths,
            });
            return;
          case "listWorkspaceFiles":
            const workspaceFilePaths =
              this.spectacleExtension.getWorkspaceFilePaths();
            this._panel.webview.postMessage({
              command: "listWorkspaceFiles",
              workspaceFilePaths: workspaceFilePaths,
            });
            return;
          case "resetTask":
            this.spectacleExtension.resetTask();
            this._panel.webview.postMessage({
              command: "loadConversation",
              conversation: this.spectacleExtension.getConversation(),
            });
            return;
          case "openFileInEditor":
            this.spectacleExtension.openFileInEditor(filePath);
            return;

          case "addMeltyFile":
            console.log(`addFile: ${filePath}`);
            this.spectacleExtension.addMeltyFilePath(filePath);
            this._panel.webview.postMessage({
              command: "listMeltyFiles",
              meltyFilePaths: this.spectacleExtension.getMeltyFilePaths(),
            });
            vscode.window.showInformationMessage(
              `Added ${filePath} to Melty's Mind`
            );
            return;
          case "dropMeltyFile":
            console.log(`dropFile: ${filePath}`);
            this.spectacleExtension.dropMeltyFilePath(filePath);
            console.log(
              "sending back meltyFilePaths: ",
              this.spectacleExtension.getMeltyFilePaths()
            );
            vscode.window.showInformationMessage(
              `Removed ${filePath} from Melty's Mind`
            );
            this._panel.webview.postMessage({
              command: "listMeltyFiles",
              meltyFilePaths: this.spectacleExtension.getMeltyFilePaths(),
            });
            return;
          case "undo":
            await this.undoLatestCommit();
            const repo = this.spectacleExtension.getRepository();
            await repo.status();

            const latestCommit = repo.state.HEAD?.commit;
            const latestCommitMessage = await repo.getCommit(latestCommit);
            const message = `Undone commit: ${latestCommit}\nMessage: ${latestCommitMessage.message}`;
            vscode.window.showInformationMessage(message);
            this._panel.webview.postMessage({
              command: "confirmedUndo",
              text: {
                sender: "user",
                message: message,
              },
            });
            return;
          case "ask":
            await this.handleAskCode(text, "ask");
            return;

          case "code":
            await this.handleAskCode(text, "code");
            return;
          // Add more switch case statements here as more webview message commands
          // are created within the webview context (i.e. inside media/main.js)
        }
      },
      undefined,
      this._disposables
    );
  }

  private async handleAskCode(text: string, mode: "ask" | "code") {
    const meltyFilePaths = this.spectacleExtension.getMeltyFilePaths();

    const task = this.spectacleExtension.getTask();
    const humanJoule = await task.respondHuman(text);
    const humanDiff = await joules.diff(
      humanJoule,
      this.spectacleExtension.getRepository()
    );
    this._panel.webview.postMessage({
      command: "addMessage",
      text: {
        sender: "user",
        message: text,
        diff: humanDiff,
      },
    });

    // bot response
    const processPartial = (partialJoule: Joule) => {
      this._panel.webview.postMessage({
        command: "setPartialResponse",
        joule: partialJoule,
      });
    };
    try {
      const botJoule = await task.respondBot(
        meltyFilePaths, // TODO are we sending the right files here? @soybean
        mode,
        processPartial
      );
      const botDiff = await joules.diff(
        botJoule,
        this.spectacleExtension.getRepository()
      );
      // Send the response back to the webview
      this._panel.webview.postMessage({
        command: "addMessage",
        text: {
          sender: "bot",
          message: botJoule.message,
          diff: botDiff,
        },
      });
    } catch (e) {
      vscode.window.showErrorMessage(`Error talking to the bot: ${e}`);
      return;
    }
  }

  /**
   * Undo the latest commit.
   *
   * TODO: confirm with dice we want to do this
   */
  private async undoLatestCommit(): Promise<void> {
    const repo = this.spectacleExtension.getRepository();
    await repo.status();
    await repo.reset("HEAD~1", false);
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
