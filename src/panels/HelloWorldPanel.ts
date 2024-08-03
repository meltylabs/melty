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
import { sendMessageToAider } from "../aider";

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

  /**
   * The HelloWorldPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri
    );

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   */
  public static render(extensionUri: Uri) {
    if (HelloWorldPanel.currentPanel) {
      // If the webview panel already exists reveal it
      HelloWorldPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        "showHelloWorld",
        // Panel title
        "Hello World",
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

      HelloWorldPanel.currentPanel = new HelloWorldPanel(panel, extensionUri);
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
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Hello World</title>
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
        const text = message.text;

        switch (command) {
          case "hello":
            // Code that should run in response to the hello message command
            window.showInformationMessage(text);
            return;
          case "code":
            window.showInformationMessage(`Asking AI...`);

            // make a commit with whatever changes the human made
            const repo = await this.getRepository();

            const files = await vscode.workspace.findFiles(
              "**/*",
              "{.git,node_modules}/**"
            );
            const absolutePaths = files.map((file) => file.fsPath);
            await repo.add(absolutePaths);
            await repo.commit("human changes", { empty: true });

            // get latest commit diff, and send it back to the webview
            const humanDiff = await this.getLatestCommitDiff();
            this._panel.webview.postMessage({
              command: "addMessage",
              text: {
                sender: "user",
                message: text,
                diff: humanDiff,
              },
            });

            const response = await sendMessageToAider(text, "/aider/code");

            /*
             If there are fileChanges, there has already been a commit
             If there are no fileChanges, we need to create a empty commit with no changes
             */
            if (response.fileChanges.length == 0) {
              await repo.status();
              await repo.commit("bot changes", { empty: true });
            }
            await repo.status();
            const botDiff = await this.getLatestCommitDiff();

            // Send the response back to the webview
            this._panel.webview.postMessage({
              command: "addMessage",
              text: {
                sender: "bot",
                message: response.message,
                diff: botDiff,
              },
            });
            return;
          // Add more switch case statements here as more webview message commands
          // are created within the webview context (i.e. inside media/main.js)
        }
      },
      undefined,
      this._disposables
    );
  }

  /**
   * Gets current repository
   */
  private async getRepository() {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
      vscode.window.showErrorMessage("Git extension not found");
      throw new Error("Git extension not found");
    }

    const git = gitExtension.exports.getAPI(1);
    const repositories = git.repositories;
    if (repositories.length === 0) {
      vscode.window.showInformationMessage("No Git repository found");
      throw new Error("No Git repository found");
    }
    const repo = repositories[0];
    await repo.status();
    return repo;
  }

  /**
   * Gets the diff of the latest commit in the current Git repository.
   * @returns A promise that resolves to the diff string or null if there's an error.
   */
  private async getLatestCommitDiff(): Promise<string> {
    // Get the Git extension
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
      vscode.window.showErrorMessage("Git extension not found");
      throw new Error("Git extension not found");
    }

    const git = gitExtension.exports.getAPI(1);

    // Get the current repository
    const repositories = git.repositories;
    if (repositories.length === 0) {
      vscode.window.showInformationMessage("No Git repository found");
      throw new Error("No Git repository found");
    }

    const repo = repositories[0];
    await repo.status();

    // Get the latest commit
    const latestCommit = repo.state.HEAD?.commit;

    if (latestCommit) {
      // Get the commit message
      const commitMessage = await repo.getCommit(latestCommit);

      // Get the diff of the latest commit
      const diff = await repo.diffBetween(latestCommit + "^", latestCommit);

      const udiffs = await Promise.all(
        diff.map((change: any) =>
          this.generateUdiff(repo, latestCommit, change)
        )
      );

      vscode.window.showInformationMessage(
        `Latest commit: ${latestCommit}\nMessage: ${commitMessage.message}`
      );

      return udiffs.join("\n");
    } else {
      vscode.window.showInformationMessage(
        "No commits found in the repository"
      );
      throw new Error("No commits found in the repository");
    }
  }

  private async generateUdiff(
    repo: any,
    latestCommit: any,
    change: any
  ): Promise<string> {
    const diff = await repo.diffBetween(
      latestCommit + "^",
      latestCommit,
      change.uri.fsPath
    );
    return diff;
  }
}
