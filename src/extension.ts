import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { extractSpecFromCode } from "./extractor";
import * as diff from "diff";
import { TaskManager } from "./tasks/taskManager";
import { TaskInterface } from "./tasks/taskInterface";
import { PromptFormatter, askClaudeAndEdit } from "./tasks/askClaude";
import { ChatView } from "./chatView";

let outputChannel: vscode.OutputChannel;

class SpectacleExtension {
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;
  private specsFolder: string;
  private taskManager: TaskManager;
  private taskInterface: TaskInterface;
  private workspaceRoot: string;
  private chatView: ChatView | undefined;

  constructor(private context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.workspaceRoot = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : "/";
    this.specsFolder = path.join(this.workspaceRoot, "specs");
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.taskManager = new TaskManager(this.workspaceRoot, this.outputChannel);
    this.taskInterface = new TaskInterface(this.taskManager);
  }

  activate() {
    outputChannel.appendLine("Spectacle activation started");

    this.context.subscriptions.push(this.statusBarItem);

    console.log("Registering commands");
    this.registerCommands();
    console.log("Setting up code watcher");
    this.setupCodeWatcher();
    // this.setupSaveListener(); // potential feature later
    console.log("Initializing spec folder");
    this.initializeSpecFolder();
    console.log("Updating spec mode");
    this.updateSpecMode();

    // Register configuration change listener
    console.log("Registering configuration change listener");
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(
        this.handleConfigChange.bind(this)
      )
    );

    // Register ChatView provider
    console.log("Registering ChatView provider");
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        "spectacle.chatView",
        {
          resolveWebviewView: (webviewView) => {
            this.outputChannel.appendLine("Resolving WebviewView for ChatView");
            if (!webviewView) {
              this.outputChannel.appendLine("WebviewView is undefined");
              vscode.window.showErrorMessage("Failed to create ChatView: WebviewView is undefined");
              return;
            }
            try {
              this.chatView = new ChatView(webviewView, this.taskManager, this.outputChannel);
              this.taskInterface.setChatView(this.chatView);
              this.outputChannel.appendLine("ChatView created and set successfully");
              
              // Ensure the webview is visible
              webviewView.show(true);
              
              // Set the initial HTML content
              webviewView.webview.html = this.chatView.getWebviewContent();
              
              this.outputChannel.appendLine("ChatView initialized and shown");
            } catch (error) {
              this.outputChannel.appendLine(`Error creating ChatView: ${error}`);
              vscode.window.showErrorMessage(`Failed to create ChatView: ${error.message}`);
            }
          }
        }
      )
    );
    console.log("ChatView provider registered successfully");

    console.log("Spectacle activation completed");
  }

  private registerCommands() {
    const commands = [
      {
        command: "spectacle.generateSpec",
        callback: this.generateSpec.bind(this),
      },
      {
        command: "spectacle.reconcileCode",
        callback: this.reconcileCode.bind(this),
      },
      { command: "spectacle.updateSpec", callback: this.updateSpec.bind(this) },
      {
        command: "spectacle.startTask",
        callback: () => this.taskInterface.startTask(),
      },
      { command: "spectacle.updateCode", callback: this.updateCode.bind(this) },
    ];

    commands.forEach(({ command, callback }) => {
      const disposable = vscode.commands.registerCommand(command, callback);
      this.context.subscriptions.push(disposable);
    });
  }

  private setupCodeWatcher() {
    const codeWatcher = vscode.workspace.createFileSystemWatcher("**/*.ts");
    codeWatcher.onDidChange(this.generateSpec.bind(this));
    codeWatcher.onDidCreate(this.generateSpec.bind(this));
    codeWatcher.onDidDelete(this.generateSpec.bind(this));
    this.context.subscriptions.push(codeWatcher);
  }

  // private setupSaveListener() {
  //     vscode.workspace.onDidSaveTextDocument((document) => {
  //         if (document.languageId === LANGUAGE_ID) {
  //             this.reconcileSpec(document.uri);
  //         } else if (document.uri.fsPath.includes('specs') && document.uri.fsPath.endsWith('.spec')) {
  //             this.updateSpecMode();
  //         }
  //     });
  // }

  private initializeSpecFolder() {
    if (vscode.workspace.workspaceFolders) {
      if (!fs.existsSync(this.specsFolder)) {
        fs.mkdirSync(this.specsFolder, { recursive: true });
      }
    }
  }

  private async getCodeFiles() {
    const workspaceRoot =
      vscode.workspace.workspaceFolders?.[0].uri.fsPath || "";
    return await vscode.workspace.findFiles(
      "**/*.ts",
      `{**/venv/**,specs/**,**/node_modules/**}`
    );
  }

  private async getSpecFiles() {
    return await vscode.workspace.findFiles("specs/**/*.spec.ts");
  }

  private async getSpecLockFiles() {
    return await vscode.workspace.findFiles("specs/**/*.spec.generated.ts");
  }

  private codePathToSpecPath(codePath: string) {
    const specsFolder = path.join(this.workspaceRoot, "specs");
    const relativeCodePath = path.relative(this.workspaceRoot, codePath);
    const specExtension = relativeCodePath.replace(".ts", ".spec.ts");
    return path.join(specsFolder, specExtension);
  }

  private codePathToSpecLockPath(codePath: string) {
    const specsFolder = path.join(this.workspaceRoot, "specs");
    const relativeCodePath = path.relative(this.workspaceRoot, codePath);
    const specExtension = relativeCodePath.replace(".ts", ".spec.generated.ts");
    return path.join(specsFolder, specExtension);
  }

  private specFileToCodeFile(specFile: vscode.Uri) {
    // strip .spec and remove /specs/ from file path
    const codeFilePath = specFile.fsPath
      .replace(".spec.ts", ".ts")
      .replace("/specs/", "/");
    return vscode.Uri.file(codeFilePath);
  }

  private specFileToSpecLockFile(specFile: vscode.Uri) {
    const codeFilePath = specFile.fsPath.replace(
      ".spec.ts",
      ".spec.generated.ts"
    );
    return vscode.Uri.file(codeFilePath);
  }

  private async getSpecFileContents() {
    const specFiles = await this.getSpecFiles();
    return await Promise.all(
      specFiles.map(async (specFile: vscode.Uri) => {
        return await vscode.workspace.openTextDocument(specFile);
      })
    );
  }

  private async getSpecDiffs() {
    // Read all spec files and generate diffs
    const specFiles = await this.getSpecFiles();
    return await Promise.all(
      specFiles.map(async (specFile: vscode.Uri) => {
        const specLockFile = this.specFileToSpecLockFile(specFile);
        const newSpecContent = await vscode.workspace.fs.readFile(specFile);

        let oldSpecContent: Uint8Array;
        if (fs.existsSync(specLockFile.fsPath)) {
          oldSpecContent = fs.readFileSync(specLockFile.fsPath);
        } else {
          oldSpecContent = new Uint8Array();
        }

        const specDiff = diff.createTwoFilesPatch(
          path.relative(this.workspaceRoot, specLockFile.fsPath),
          path.relative(this.workspaceRoot, specFile.fsPath),
          oldSpecContent.toString(),
          newSpecContent.toString()
        );

        return {
          path: path.relative(this.workspaceRoot, specFile.fsPath),
          diff: specDiff,
        };
      })
    );
  }

  /**
   * Updates the code in the focused window based on the given instruction.
   * @param instruction The instruction to update the code.
   */
  async updateCode() {
    if (!vscode.workspace.workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    const codeFiles = await this.getCodeFiles();
    const codeFile = vscode.window.activeTextEditor?.document.uri;
    if (!codeFile) {
      vscode.window.showErrorMessage("No code file open");
      return;
    } else if (!codeFiles.some((file) => file.fsPath === codeFile.fsPath)) {
      vscode.window.showErrorMessage("Code file not known to Spectacular");
      return;
    }

    const instruction = await vscode.window.showInputBox({
      prompt: "How do you want to update the code?",
      placeHolder: "e.g., Add a new function to calculate the factorial",
    });

    const codeDoc = await vscode.workspace.openTextDocument(codeFile);
    const codeContent = codeDoc.getText();

    const specDocs = await this.getSpecFileContents();

    const prompt = `${PromptFormatter.writeIntroToSpecs()}

Here are all the current .spec files for a TypeScript program:

${PromptFormatter.formatTextDocuments(specDocs, this.workspaceRoot)}

The user wants to update the code file ${path.relative(
      this.workspaceRoot,
      codeFile.fsPath
    )}. They gave this instruction:
${instruction ? PromptFormatter.formatMessage(instruction) : ""}

Here's the current TypeScript code for that file:

${codeContent}

Please update this TypeScript file according to the user's instruction. Consider all the spec files, but only provide updates for this single TypeScript file.

${PromptFormatter.writeOutputInstructions(false)}`;

    const claudeEditResponse = await askClaudeAndEdit(
      prompt,
      this.workspaceRoot
    );

    if (claudeEditResponse.editStatus === "success") {
      vscode.window.showInformationMessage(
        `${path.basename(
          codeFile.fsPath
        )} has been updated according to the instruction`
      );
    }
  }

  async updateSpecMode() {
    const config = vscode.workspace.getConfiguration();

    if (!vscode.workspace.workspaceFolders || !this.specsFolder) {
      vscode.window.showErrorMessage(
        "No workspace folder open or specs folder not initialized"
      );
      return;
    }

    const specFiles = await this.getSpecFiles();
    const specLockFiles = await this.getSpecLockFiles();

    const isSpecMode = specFiles.some((specFile: vscode.Uri) => {
      const specLockFilePath = specFile.fsPath + ".generated";
      if (!fs.existsSync(specLockFilePath)) {
        return true; // no generated file ==> code doesn't exist
      }
      const specLockFile = vscode.Uri.file(specLockFilePath);
      return !specLockFiles.some(
        (lockFile) => lockFile.fsPath === specLockFile.fsPath
      );
    });

    this.statusBarItem.text = isSpecMode
      ? "$(eye) Spec Mode"
      : "$(code) Code Mode";
    this.statusBarItem.show();

    if (isSpecMode) {
      config.update(
        "workbench.colorCustomizations",
        {
          "statusBar.background": "#d70966",
        },
        vscode.ConfigurationTarget.Workspace
      );
    } else {
      config.update(
        "workbench.colorCustomizations",
        {
          "statusBar.background": "#0cb06e",
        },
        vscode.ConfigurationTarget.Workspace
      );
    }
  }

  async generateSpec() {
    if (!vscode.workspace.workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    const specsFolder = path.join(this.workspaceRoot, "specs");

    // Ensure specs folder exists
    if (!fs.existsSync(specsFolder)) {
      fs.mkdirSync(specsFolder, { recursive: true });
    }

    const codeFiles = await this.getCodeFiles();

    for (const file of codeFiles) {
      const specPath = this.codePathToSpecPath(file.fsPath);
      const specLockPath = this.codePathToSpecLockPath(file.fsPath);

      const vscodeTextDocument = await vscode.workspace.openTextDocument(file);
      const specComponent = await extractSpecFromCode(vscodeTextDocument);

      // Check if spec and spec.generated are in sync
      if (fs.existsSync(specPath) && fs.existsSync(specLockPath)) {
        const specContent = fs.readFileSync(specPath, "utf-8");
        const specLockContent = fs.readFileSync(specLockPath, "utf-8");

        if (specContent === specLockContent) {
          // Write to spec file
          fs.writeFileSync(specPath, specComponent);
        }
      } else {
        // If files don't exist, create them
        fs.mkdirSync(path.dirname(specPath), { recursive: true });
        fs.writeFileSync(specPath, specComponent);
      }

      // Always write to spec.generated
      fs.writeFileSync(specLockPath, specComponent);
    }

    vscode.window.showInformationMessage("Specs generated for all code files");
  }

  async reconcileCode() {
    // Step 1: error handling & user chooses a file

    if (!vscode.workspace.workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    const specsFolder = path.join(this.workspaceRoot, "specs");

    if (!fs.existsSync(specsFolder)) {
      vscode.window.showErrorMessage("Specs folder not found");
      return;
    }

    const specFiles = await this.getSpecFiles();
    const selectedSpecFile = await vscode.window.showQuickPick(
      specFiles.map((file: vscode.Uri) => ({
        label: path.relative(this.workspaceRoot, file.fsPath),
        file: file,
      })),
      { placeHolder: "Select a spec file to write code for" }
    );
    if (!selectedSpecFile) {
      return; // User cancelled the selection
    }
    const codeFile = this.specFileToCodeFile(selectedSpecFile.file);

    vscode.window.showInformationMessage(
      `Reconciling ${path.relative(this.workspaceRoot, codeFile.fsPath)}`
    );

    // Step 2: heavy stuff

    const specDocs = await this.getSpecFileContents();
    const specDiffs = await this.getSpecDiffs();

    // Read the contents of the selected TypeScript file
    const codeDoc = fs.existsSync(codeFile.fsPath)
      ? await vscode.workspace.openTextDocument(codeFile)
      : "";
    const codeContent = codeDoc ? codeDoc.getText() : "";

    const prompt = `${PromptFormatter.writeIntroToSpecs()}

Here are all the current .spec files for a TypeScript program:

${PromptFormatter.formatTextDocuments(specDocs, this.workspaceRoot)}

The user has updated the specs for the program. Here are the changes they made to the specs:

${specDiffs
  .map((specDiff) => PromptFormatter.formatDiff(specDiff.path, specDiff.diff))
  .join("\n")}

I'm going to ask you to rewrite the file ${path.relative(
      this.workspaceRoot,
      codeFile.fsPath
    )} to implement the new specifications the user wrote.

Here's the current TypeScript code for that file:

${codeContent}

Please rewrite this TypeScript file to implement the new specifications. Consider all the spec files and their changes, but only provide updates for this single TypeScript file.

${PromptFormatter.writeOutputInstructions(false)}`;

    const claudeEditResponse = await askClaudeAndEdit(
      prompt,
      this.workspaceRoot
    );

    if (claudeEditResponse.editStatus === "success") {
      vscode.window.showInformationMessage(
        `${path.basename(
          codeFile.fsPath
        )} has been updated according to the new specs`
      );
    }

    this.updateSpecMode();
  }

  reconcileSpec(fileUri: vscode.Uri) {
    // Generate the entire spec file on any change or save
    this.generateSpec();
  }

  private async updateSpec() {
    const instruction = await vscode.window.showInputBox({
      prompt: "How do you want to update the spec?",
      placeHolder: "e.g., Add a new function to calculate the factorial",
    });

    if (instruction) {
      vscode.window.showInformationMessage(
        `Received spec update: ${instruction}`
      );

      if (!this.specsFolder) {
        vscode.window.showErrorMessage("Specs folder not initialized");
        return;
      }

      const specDocs = await this.getSpecFileContents();

      const prompt = `${PromptFormatter.writeIntroToSpecs()}

Here are the current .spec files for a TypeScript program:

${PromptFormatter.formatTextDocuments(specDocs, this.workspaceRoot)}

The user wants to update the specs. They gave this instruction:
${PromptFormatter.formatMessage(instruction)}

Please provide revised versions of any spec files that need to change to accomodate this.
${PromptFormatter.writeOutputInstructions(false)}`;

      const claudeEditResponse = await askClaudeAndEdit(
        prompt,
        this.workspaceRoot
      );

      if (claudeEditResponse.editStatus === "success") {
        vscode.window.showInformationMessage(
          "Specifications have been updated"
        );
        this.updateSpecMode();
      }
    }
  }

  private handleConfigChange(e: vscode.ConfigurationChangeEvent) {
    if (e.affectsConfiguration("spectacle.anthropicApiKey")) {
      // Optionally handle configuration changes
    }
  }

  deactivate() {
    this.statusBarItem.dispose();
    this.resetEditorBackground();
  }

  private resetEditorBackground() {
    const config = vscode.workspace.getConfiguration();
    config.update(
      "workbench.colorCustomizations",
      {
        "editor.background": undefined,
      },
      vscode.ConfigurationTarget.Workspace
    );
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Activating Spectacle extension');
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
import * as vscode from 'vscode';
import { ChatView } from './chatView';

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating Spectacle extension');
    const outputChannel = vscode.window.createOutputChannel("Spectacle");
    outputChannel.show();
    outputChannel.appendLine('Activating Spectacle extension');
    const extension = new SpectacleExtension(context, outputChannel);
    extension.activate();
    outputChannel.appendLine('Spectacle extension activated');
    console.log('Spectacle extension activated');
}

export function deactivate() {
    console.log('Deactivating Spectacle extension');
}
