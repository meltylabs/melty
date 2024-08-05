import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";
import { MeltyFile } from "./backend/meltyFiles";

export class SpectacleExtension {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;
  private meltyFilePaths: string[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : "/";
    this.meltyFilePaths = [];
    this.initializeMeltyFilePaths();
  }

  async activate() {
    outputChannel.appendLine("Spectacle activation started");

    // Initialize meltyFilePaths
    await this.initializeMeltyFilePaths();

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

  async getMeltyFiles(): Promise<{ [relativePath: string]: MeltyFile }> {
    const workspaceFileUris = await vscode.workspace.findFiles(
      "**/*",
      "**/node_modules/**"
    );
    const meltyFiles: { [relativePath: string]: MeltyFile } =
      Object.fromEntries(
        await Promise.all(
          workspaceFileUris.map(async (file) => {
            const relativePath = path.relative(this.workspaceRoot, file.fsPath);
            const contents = await fs.promises.readFile(file.fsPath, "utf8");
            return [
              relativePath,
              {
                path: relativePath,
                contents: contents,
                workspaceRoot: this.workspaceRoot,
              },
            ];
          })
        )
      );
    return meltyFiles;
  }

  // New method to initialize meltyFilePaths
  private async initializeMeltyFilePaths() {
    const meltyFiles = await this.getMeltyFiles();
    this.meltyFilePaths = Object.keys(meltyFiles);
    this.outputChannel
      .appendLine(`Initialized ${this.meltyFilePaths.length} melty file
    paths`);
  }

  public getMeltyFilePaths(): string[] {
    return this.meltyFilePaths;
  }

  public addMeltyFilePath(filePath: string) {
    this.meltyFilePaths.push(filePath);
  }

  public dropMeltyFilePath(filePath: string) {
    this.meltyFilePaths = this.meltyFilePaths.filter(
      (path) => path !== filePath
    );
  }
}

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating Spectacle extension");
  outputChannel = vscode.window.createOutputChannel("Spectacle");
  outputChannel.show();
  outputChannel.appendLine("Activating Spectacle extension");

  const extension = new SpectacleExtension(context, outputChannel);
  extension.activate();

  const helloCommand = vscode.commands.registerCommand(
    "hello-world.showHelloWorld",
    () => {
      HelloWorldPanel.render(context.extensionUri, extension);
    }
  );

  context.subscriptions.push(helloCommand);

  outputChannel.appendLine("Spectacle extension activated");
  console.log("Spectacle extension activated");
}

export function deactivate() {
  // The extension instance will be garbage collected, so we don't need to call deactivate explicitly
}
