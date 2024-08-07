import * as vscode from "vscode";
import * as path from "path";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";
import { Conversation } from "./types";
import { Task } from "./backend/tasks";

import { Message } from "./types";

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

const dummy: Message = {
  diff: "",
  text: `Certainly! I'll create a new file called "Hooray" that demonstrates streaming functionality. Here's how we'll do it: 1. Create a new file called "Hooray.ts" in the root directory. 2. Implement a simple streaming function using Node.js's stream API. 3. Add some comments to explain the code. Here's the implementation: <CodeChange file="Hooray.ts"> <<<<<<< SEARCH ======= import { Readable } from 'stream'; /** * Creates a readable stream that emits "Hooray!" multiple times. * @param count The number of times to emit "Hooray!" * @returns A readable stream */ function createHoorayStream(count: number): Readable { let emitted = 0; return new Readable({ read() { if (emitted < count) { this.push("Hooray!"); emitted++; } else { this.push(null); // Signal the end of the stream } } }); } /** * Demonstrates the usage of the Hooray stream. */ function demonstrateHoorayStream() { const stream = createHoorayStream(5); stream.on('data', (chunk) => { console.log(chunk.toString()); }); stream.on('end', () => { console.log("Stream ended!"); }); } // Run the demonstration demonstrateHoorayStream(); export { createHoorayStream }; >>>>>>> REPLACE </CodeChange> I've created a new file called "Hooray.ts" with a simple implementation of a streaming function. Here's a breakdown of what the code does: 1. We import the \`Readable\` class from Node.js's 'stream' module. 2. We define a \`createHoorayStream\` function that creates a readable stream. This stream will emit "Hooray!" a specified number of times. 3. We implement a \`demonstrateHoorayStream\` function to show how to use the stream. 4. The stream emits "Hooray!" multiple times and then ends. 5. We export the \`createHoorayStream\` function so it can be used in other files if needed. This implementation demonstrates a basic use of Node.js streams, which are a fundamental concept in Node.js for working with streaming data. The stream in this example is very simple, but the same principles apply to more complex scenarios like reading large files or handling network requests. To test this, you could run the file using Node.js. If you want to integrate this into your project further, you might consider: 1. Adding this file to your TypeScript compilation process. 2. Creating unit tests for the \`createHoorayStream\` function. 3. Using this stream in other parts of your application where you need to demonstrate streaming concepts. Let me know if you want to make any changes to this file or if you'd like to see how to use this stream in other parts of your project!`,
  sender: "bot",
};

export class SpectacleExtension {
  private outputChannel: vscode.OutputChannel;
  private meltyMindFilePaths: string[] = [];
  private workspaceFilePaths: string[] | undefined;
  private task: Task | undefined;
  private tasks: Map<string, Task> = new Map();

  constructor(
    private context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
  }

  async activate() {
    outputChannel.appendLine("Spectacle activation started");

    this.task = new Task();
    // don't bother kicking off task.init() here; the git repo isn't ready.

    // kick off async init. this will also be kicked off by callers who use this object
    await this.initializeWorkspaceFilePaths();
  }

  public getMeltyMindFilePaths() {
    // TODO figure out why there are empty strings in the array
    return this.meltyMindFilePaths!.filter((path) => path !== "");
  }

  public async getWorkspaceFilePaths() {
    if (this.workspaceFilePaths === undefined) {
      if (!(await this.initializeWorkspaceFilePaths())) {
        throw new Error("Could not initialize workspace file paths");
      }
    }
    return this.workspaceFilePaths!;
  }

  private async initializeWorkspaceFilePaths(): Promise<boolean> {
    if (this.workspaceFilePaths !== undefined) {
      return true;
    }

    if (!(await this.task!.init())) {
      return false;
    }

    const workspaceFileUris = await vscode.workspace.findFiles(
      "**/*",
      "**/node_modules/**"
    );
    this.workspaceFilePaths = workspaceFileUris.map((file) => {
      return path.relative(this.task!.gitRepo!.rootPath, file.fsPath);
    });
    return true;
  }

  public addMeltyMindFilePath(filePath: string) {
    this.meltyMindFilePaths.push(filePath);
    this.outputChannel.appendLine(`Added file: ${filePath}`);
  }

  public dropMeltyMindFilePath(filePath: string) {
    this.meltyMindFilePaths = this.meltyMindFilePaths.filter(
      (path) => path !== filePath
    );
    this.outputChannel.appendLine(`Dropped file: ${filePath}`);
  }

  public getConversation(): Conversation {
    return this.task!.conversation;
  }

  public async createNewTask(taskName: string): Promise<string> {
    const taskId = `task_${Date.now()}`;
    const branchName = `task/${taskName.replace(/\s+/g, "-")}`;

    const newTask = new Task(taskId, branchName);
    await newTask.init();

    // Create a new branch for this task
    await this.createGitBranch(branchName);

    this.tasks.set(taskId, newTask);
    this.task = newTask;

    return taskId;
  }

  public resetTask() {
    // this.task = new Task();
    throw new Error("Not implemented");
  }

  public async switchToTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    // Switch to the task's branch
    await this.checkoutGitBranch(task.branch);

    this.task = task;
  }

  public openFileInEditor(filePath: string) {
    const fileUri = vscode.Uri.file(
      path.join(this.task!.gitRepo!.rootPath, filePath)
    );
    vscode.window.showTextDocument(fileUri);
  }

  private async checkoutGitBranch(branchName: string): Promise<void> {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension) {
      const git = gitExtension.exports.getAPI(1);
      const repo = git.repositories[0];
      await repo.checkout(branchName);
    } else {
      throw new Error("Git extension not found");
    }
  }

  public async initRepository() {
    await this.task!.init();
  }

  public async getTask() {
    if (!this.task!.gitRepo) {
      await this.task!.init();
    }
    return this.task!;
  }

  private async createGitBranch(branchName: string): Promise<void> {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension) {
      const git = gitExtension.exports.getAPI(1);
      const repo = git.repositories[0];
      await repo.createBranch(branchName, true);
    } else {
      throw new Error("Git extension not found");
    }
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
    "melty.showMelty",
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
