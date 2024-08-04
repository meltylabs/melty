import * as vscode from "vscode";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";

export class SpectacleExtension {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;

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

  const helloCommand = vscode.commands.registerCommand(
    "hello-world.showHelloWorld",
    () => {
      HelloWorldPanel.render(context.extensionUri);
    }
  );

  context.subscriptions.push(helloCommand);

  const extension = new SpectacleExtension(context, outputChannel);
  extension.activate();
  outputChannel.appendLine("Spectacle extension activated");
  console.log("Spectacle extension activated");

  // Log the registered commands
  const commands = vscode.commands.getCommands(true);
  commands.then((cmds) => {
    outputChannel.appendLine("Registered commands: " + cmds.join(", "));
  });
}

export function deactivate() {
  // The extension instance will be garbage collected, so we don't need to call deactivate explicitly
}
