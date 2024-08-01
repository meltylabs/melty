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
  outputChannel.appendLine("Activating Spectacle extension");

  try {
    const extension = new SpectacleExtension(context, outputChannel);
    extension.activate();
    outputChannel.appendLine("Spectacle extension activated");
    console.log("Spectacle extension activated");
  } catch (error) {
    console.error("Error during Spectacle activation:", error);
    outputChannel.appendLine(
      "Error during Spectacle activation: " +
        (error instanceof Error ? error.message : String(error))
    );
    vscode.window.showErrorMessage(
      "Failed to activate Spectacle extension. Please check the output channel for details."
    );
  }
}
