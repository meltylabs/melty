import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";
import { MeltyFile } from "./backend/meltyFiles";
import * as conversations from "./backend/conversations";
import { Conversation } from "./backend/conversations";

export interface Message {
  text: string;
  sender: "user" | "bot";
  diff?: string;
}

const dummy2: Message = {
  diff: "",
  text: "hi",
  sender: "user",
};

const dummy1: Message = {
  diff: "",
  text: "Hello! I'm here to assist you. Since you haven't made any specific request for changes yet, there\nare no files that I can identify as needing changes at this moment. When you have a specific task\nor modification in mind, please let me know, and I'll be happy to suggest which files might need \nto be edited to accomplish that task. Once I've identified potential files for editing, I'll stop\nand wait for your approval before proceeding with any changes.                                   Tokens: 12,556 sent, 94 received. Cost: $0.04 request, $0.04 session.",
  sender: "bot",
};

const dummy3: Message = {
  diff: "diff --git a/hi.txt b/hi.txt\nnew file mode 100644\nindex 0000000..a7299ca\n--- /dev/null\n+++ b/hi.txt\n@@ -0,0 +1 @@\n+Hello! This is the content of hi.txt file.",
  text: 'Certainly! I can create a new file named "hi.txt" for you. Since this is a new file, we don\'t    \nneed to search for existing content. Here\'s the SEARCH/REPLACE block to create the file:         \n\nhi.txt                                                                                           \n                                                                                                 \n <<<<<<< SEARCH                                                                                   =======                                                                                          Hello! This is the content of hi.txt file.                                                       >>>>>>> REPLACE                                                                                 \n                                                                                                 \n\nThis will create a new file named "hi.txt" in the current directory with a simple greeting       \nmessage. Let me know if you want to make any changes to the content or if you\'d like to proceed  \nwith creating this file.                                                                         Tokens: 12,680 sent, 119 received. Cost: $0.04 request, $0.08 session.Applied edit to hi.txtCommit 0afed18 Create new hi.txt fileYou can use /undo to revert and discard commit 0afed18.',
  sender: "bot",
};

export class SpectacleExtension {
  private outputChannel: vscode.OutputChannel;
  private workspaceRoot: string;
  private meltyFilePaths: string[] = [];
  private workspaceFilePaths: string[] = [];
  private messages: Message[] = [dummy1, dummy2, dummy3];
  private conversation: Conversation;

  constructor(
    private context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : "/";

    this.conversation = conversations.create();

    this.initializeMeltyFilePaths();
    this.initializeWorkspaceFilePaths();
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

  async getWorkspaceFiles(): Promise<{ [relativePath: string]: MeltyFile }> {
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

  private async initializeMeltyFilePaths() {
    const meltyFiles = await this.getMeltyFiles();
    this.meltyFilePaths = Object.keys(meltyFiles);
  }

  private async initializeWorkspaceFilePaths() {
    const workspaceFiles = await this.getWorkspaceFiles();
    this.workspaceFilePaths = Object.keys(workspaceFiles);
  }

  public getMeltyFilePaths(): string[] {
    return this.meltyFilePaths.filter((path) => path !== ""); // todo: figure out why there are empty strings in the array
  }

  public getWorkspaceFilePaths(): string[] {
    return this.workspaceFilePaths;
  }

  public addMeltyFilePath(filePath: string) {
    this.meltyFilePaths.push(filePath);
  }

  public dropMeltyFilePath(filePath: string) {
    this.meltyFilePaths = this.meltyFilePaths.filter(
      (path) => path !== filePath
    );
    this.outputChannel.appendLine(`Dropped file: ${filePath}`);
  }

  public addMessage(message: Message) {
    this.messages.push(message);
  }

  public getMessages(): Message[] {
    return this.messages;
  }

  public resetMessages() {
    this.messages = [];
  }

  public getConversation(): Conversation {
    return this.conversation;
  }

  public resetConversation() {
    this.conversation = conversations.create();
  }

  public setConversation(conversation: Conversation) {
    this.conversation = conversation;
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
