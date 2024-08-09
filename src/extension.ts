import * as vscode from "vscode";
import * as path from "path";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";
import { Conversation } from "./types";
import { Task } from "./backend/tasks";
import * as datastores from "./backend/datastores";
import * as utils from "./util/utils";
import { v4 as uuidv4 } from "uuid";
import { Octokit } from "@octokit/rest";

export class MeltyExtension {
  private outputChannel: vscode.OutputChannel;
  private meltyMindFilePaths: string[] = [];
  private workspaceFilePaths: string[] | undefined;
  private tasks: Map<string, Task> = new Map();
  private currentTask: Task | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
  }

  async activate() {
    outputChannel.appendLine("Melty activation started");

    if (vscode.workspace.workspaceFolders) {
      this.tasks = datastores.loadTasksFromDisk(
        // TODO for now we assume gitRepo folder == workspace folder
        vscode.workspace.workspaceFolders![0].uri.fsPath
      );
    }

    // create a new task if there aren't any
    if (!this.tasks.size) {
      const taskId = await this.createNewTask("First task");
      this.currentTask = (this.tasks as Map<string, Task>).get(taskId);
    }

    // Set the first task as current
    this.currentTask = this.tasks.values().next().value;

    // kick off async inits. this will also be kicked off by callers who use this object
    // don't bother kicking off task.init() here; the git repo isn't ready.
    if (this.currentTask) {
      this.initializeWorkspaceFilePaths(this.currentTask);
    }
  }

  async deactivate(): Promise<void> {
    // The extension instance will be garbage collected, so we don't need to call deactivate explicitly
    for (const task of this.tasks.values()) {
      await datastores.writeTaskToDisk(task);
    }
  }

  public getMeltyMindFilePaths() {
    // TODO figure out why there are empty strings in the array
    return this.meltyMindFilePaths!.filter((path) => path !== "");
  }

  public async getWorkspaceFilePaths() {
    if (!this.currentTask) {
      throw new Error("No current task");
    }
    if (this.workspaceFilePaths === undefined) {
      if (!(await this.initializeWorkspaceFilePaths(this.currentTask))) {
        throw new Error("Could not initialize workspace file paths");
      }
    }
    return this.workspaceFilePaths!;
  }

  public listTasks(): { id: string; branch: string }[] {
    return Array.from(this.tasks.values()).map(utils.serializableTask);
  }

  private async initializeWorkspaceFilePaths(task: Task): Promise<boolean> {
    if (this.workspaceFilePaths !== undefined) {
      return true;
    }

    if (!this.currentTask) {
      return false;
    }

    if (!(await this.currentTask.init())) {
      return false;
    }

    this.workspaceFilePaths = await utils.getWorkspaceFilePaths(
      this.currentTask.gitRepo!
    );
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

  public getConversation(taskId: string): Conversation {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }
    return task.conversation;
  }

  public getTask(taskId: string): Task {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }
    return task;
  }

  public async createNewTask(name: string): Promise<string> {
    const taskId = uuidv4();
    const taskName = `${new Date().toLocaleString()}`;
    const branchName = `melty/${taskName.replace(/\s+/g, "-")}`;

    const newTask = new Task(taskId, name, branchName);

    this.tasks.set(taskId, newTask);
    this.currentTask = newTask;

    return taskId;
  }

  public resetTask() {
    throw new Error("Not implemented");
  }

  public async switchToTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    // Switch to the task's branch
    // todo: add this back once testing is done
    // await this.checkoutGitBranch(task.branch);
    // vscode.window.showInformationMessage(`Switched to branch ${task.branch}`);

    this.currentTask = task;
    this.workspaceFilePaths = undefined; // Reset workspace file paths
    await this.initializeWorkspaceFilePaths(task); // Re-initialize workspace file paths
  }

  public openFileInEditor(filePath: string) {
    if (!this.currentTask || !this.currentTask.gitRepo) {
      throw new Error("No current task or git repository");
    }
    const fileUri = vscode.Uri.file(
      path.join(this.currentTask.gitRepo.rootPath, filePath)
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
    if (!this.currentTask) {
      throw new Error("No current task");
    }
    await this.currentTask.init();
  }

  public async getCurrentTask(): Promise<Task> {
    if (!this.currentTask) {
      throw new Error("No current task");
    }
    if (!this.currentTask.gitRepo) {
      console.log(`initializing task ${this.currentTask.id} repo`);
      await this.currentTask.init();
    }
    if (!this.workspaceFilePaths) {
      await this.initializeWorkspaceFilePaths(this.currentTask);
    }
    return this.currentTask;
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

  public async createPullRequest() {
    try {
      const gitExtension =
        vscode.extensions.getExtension("vscode.git")?.exports;
      const git = gitExtension.getAPI(1);
      const repository = git.repositories[0];

      if (!repository) {
        vscode.window.showErrorMessage("No Git repository found");
        return;
      }

      const currentBranch = repository.state.HEAD?.name;
      if (!currentBranch) {
        vscode.window.showErrorMessage("No current branch found");
        return;
      }

      // Push the current branch to remote
      // may want to try pushTo?
      //   async pushTo(remote?: string, name?: string, setUpstream = false, forcePushMode?: ForcePushMode): Promise<void> {
      // 	await this.run(Operation.Push, () => this._push(remote, name, setUpstream, undefined, forcePushMode));
      // }
      //   await vscode.window.withProgress(
      //     {
      //       location: vscode.ProgressLocation.Notification,
      //       title: "Pushing changes...",
      //       cancellable: false,
      //     },
      //     async (progress) => {
      //       await repository.pushTo("origin", currentBranch, true);
      //     }
      //   );

      const token = vscode.workspace
        .getConfiguration()
        .get("melty.githubToken");

      // Create PR using GitHub API
      const octokit = new Octokit({ auth: token });
      //   const [owner, repo] =
      //     repository.state.remotes[0].fetchUrl?.split(":")[1].split("/") || [];

      const owner = "cbh123";
      const repo = "prompt";
      // https://github.com/jacksondc/spectacular.git'
      // get owner and repo from fetchUrl

      try {
        const { data: repoData } = await octokit.repos.get({ owner, repo });
        console.log("Repository found:", repoData.full_name);
      } catch (error) {
        console.error("Error fetching repository:", error);
        vscode.window.showErrorMessage(
          `Failed to find repository: ${owner}/${repo}`
        );
        return;
      }

      try {
        const { data: pulls } = await octokit.pulls.list({ owner, repo });
        console.log(
          "Existing pull requests:",
          pulls.map((pr) => pr.number)
        );
      } catch (error) {
        console.error("Error listing pull requests:", error);
        vscode.window.showErrorMessage(
          `Failed to list pull requests: ${(error as Error).message}`
        );
        return;
      }

      const { data: pullRequest } = await octokit.pulls.create({
        owner,
        repo,
        title: `PR from ${currentBranch}`,
        head: currentBranch,
        base: "main", // or your default branch name
        body: "Please review these changes",
      });

      vscode.window.showInformationMessage(
        `Pull request created: ${pullRequest.html_url}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to create PR: ${(error as Error).message}`
      );
    }
  }
}

let outputChannel: vscode.OutputChannel;
let extension: MeltyExtension;

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating Melty extension");
  outputChannel = vscode.window.createOutputChannel("Melty");
  outputChannel.show();
  outputChannel.appendLine("Activating Melty extension");

  extension = new MeltyExtension(context, outputChannel);
  extension.activate();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "melty.chatView",
      new HelloWorldPanel(context.extensionUri, extension)
    )
  );

  outputChannel.appendLine("Melty extension activated");
  console.log("Melty extension activated");
}

export async function deactivate(): Promise<void> {
  await extension.deactivate();
  console.log("Melty extension deactivated");
}
