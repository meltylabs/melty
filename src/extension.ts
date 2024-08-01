import * as vscode from "vscode";
import { ChatView } from "./chatView";

export class SpectacleExtension {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;
  private chatView: ChatView | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : "/";
  }

  activate() {
    outputChannel.appendLine("Spectacle activation started");

    // Register configuration change listener
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(
        this.handleConfigChange.bind(this)
      )
    );

    // Register ChatView provider
    console.log("Registering ChatView provider");
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider("spectacle.chatView", {
        resolveWebviewView: (webviewView) => {
          this.outputChannel.appendLine("Resolving WebviewView for ChatView");
          if (!webviewView) {
            this.outputChannel.appendLine("WebviewView is undefined");
            vscode.window.showErrorMessage(
              "Failed to create ChatView: WebviewView is undefined"
            );
            return;
          }
          try {
            this.chatView = new ChatView(webviewView);
            this.outputChannel.appendLine(
              "ChatView created and set successfully"
            );

            // Ensure the webview is visible
            webviewView.show(true);

            // Set the initial HTML content
            webviewView.webview.html = this.chatView.getWebviewContent();

            this.outputChannel.appendLine("ChatView initialized and shown");
          } catch (error) {
            this.outputChannel.appendLine(`Error creating ChatView: ${error}`);
            vscode.window.showErrorMessage(
              `Failed to create ChatView: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        },
      })
    );
    console.log("ChatView provider registered successfully");

    console.log("Spectacle activation completed");
  }

  private handleConfigChange(e: vscode.ConfigurationChangeEvent) {
    if (e.affectsConfiguration("spectacle.anthropicApiKey")) {
      // Optionally handle configuration changes
    }
  }
}

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating Spectacle extension");
  outputChannel = vscode.window.createOutputChannel("Spectacle");
  outputChannel.show();
  outputChannel.appendLine('Activating Spectacle extension');
  const extension = new SpectacleExtension(context, outputChannel);
  extension.activate();
  outputChannel.appendLine('Spectacle extension activated');
  console.log('Spectacle extension activated');

  // Log the registered commands
  const commands = vscode.commands.getCommands(true);
  commands.then((cmds) => {
    console.log('Registered commands:', cmds);
    outputChannel.appendLine('Registered commands: ' + cmds.join(', '));
  });

  // Add event listener for webview panel creation
  context.subscriptions.push(
    vscode.window.registerWebviewPanelSerializer('spectacle.chatView', {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
        console.log('Deserializing webview panel');
        outputChannel.appendLine('Deserializing webview panel');
        // You might need to reinitialize the ChatView here
      }
    })
  );

  // Log when commands are executed
  vscode.commands.executeCommand = new Proxy(vscode.commands.executeCommand, {
    apply: function(target, thisArg, argumentsList) {
      console.log(`Executing command: ${argumentsList[0]}`);
      outputChannel.appendLine(`Executing command: ${argumentsList[0]}`);
      return target.apply(thisArg, argumentsList);
    }
  });
}

export function deactivate() {
  // The extension instance will be garbage collected, so we don't need to call deactivate explicitly
}
