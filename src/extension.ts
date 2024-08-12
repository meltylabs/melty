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
  private tasks: Map<string, Task> = new Map();
  private currentTask: Task | undefined;

  public meltyRoot: string | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
  }

  public pushSubscription(subscription: vscode.Disposable) {
    this.context.subscriptions.push(subscription);
  }

  async activate() {
    // TODO need to decide whether to privilege workspace or repo
    this.meltyRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;

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
    // don't bother kicking off task.init() here; the git repo isn't ready.
  }

  async deactivate(): Promise<void> {
    // The extension instance will be garbage collected, so we don't need to call deactivate explicitly
    for (const task of this.tasks.values()) {
      await datastores.writeTaskToDisk(task);
    }
  }

  public listTasks(): { id: string; branch: string }[] {
    return Array.from(this.tasks.values()).map(utils.serializableTask);
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

  public async createNewTask(taskName: string): Promise<string> {
    const taskId = uuidv4();
    const branchName = `melty/${taskName.replace(/\s+/g, "-")}`;

    const newTask = new Task(taskId, taskName, branchName);

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

    await task.switchTo();

    this.currentTask = task;
    // TODO hopefully files will be refreshed automatically?
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

  /**
   * Creates a pull request for the current branch.
   */
  public async deleteTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    // Remove the task from the map
    this.tasks.delete(taskId);

    // If the deleted task was the current task, set currentTask to undefined
    if (this.currentTask && this.currentTask.id === taskId) {
      this.currentTask = undefined;
    }

    // Delete the task from disk
    await datastores.deleteTaskFromDisk(task);

    // TODO: Consider cleaning up any associated Git branches or other resources
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

      const latestCommit = await repository.getCommit("HEAD");
      const commitSha = latestCommit.hash;

      console.log("Current branch:", currentBranch);
      console.log("Latest commit SHA:", commitSha);

      const token = vscode.workspace
        .getConfiguration()
        .get("melty.githubToken");

      if (!token) {
        vscode.window.showErrorMessage(
          "No GitHub token found. Please set the melty.githubToken setting."
        );
        return;
      }

      const ownerAndRepo = this.getOwnerAndRepo(repository);
      if (!ownerAndRepo) {
        vscode.window.showErrorMessage(
          "Failed to determine owner and repo from remote URL"
        );
        return;
      }
      const [owner, repo] = ownerAndRepo;

      console.log("Owner:", owner);
      console.log("Repo:", repo);

      const octokit = new Octokit({ auth: token });

      // Check if branch exists on GitHub
      let branchExists = false;
      try {
        const { data: ref } = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${currentBranch}`,
        });
        branchExists = true;
        console.log("Remote branch exists:", ref.ref);
      } catch (error) {
        if ((error as any).status === 404) {
          console.log("Remote branch does not exist, will create new");
        } else {
          console.error("Error checking remote branch:", error);
        }
      }

      // Ensure the commit exists on the remote
      try {
        await octokit.git.getCommit({
          owner,
          repo,
          commit_sha: commitSha,
        });
        console.log("Commit exists on remote");
      } catch (error) {
        if ((error as any).status === 404) {
          console.log("Commit does not exist on remote, pushing changes");
          await repository.push();
        } else {
          console.error("Error checking commit:", error);
          throw error;
        }
      }

      // Create or update the branch
      try {
        if (branchExists) {
          const result = await octokit.git.updateRef({
            owner,
            repo,
            ref: `heads/${currentBranch}`,
            sha: commitSha,
            force: true,
          });
          console.log("Branch updated:", result.data.ref);
        } else {
          const result = await octokit.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${currentBranch}`,
            sha: commitSha,
          });
          console.log("Branch created:", result.data.ref);
        }
      } catch (error) {
        console.error(
          "Error creating/updating branch:",
          JSON.stringify(error, null, 2)
        );
        if ((error as any).response) {
          console.error(
            "Error response:",
            JSON.stringify((error as any).response.data, null, 2)
          );
        }
        throw error;
      }

      // Verify the push was successful
      try {
        const { data: ref } = await octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${currentBranch}`,
        });
        console.log("Branch ref after push:", ref.ref);
        console.log("Branch SHA after push:", ref.object.sha);
        if (ref.object.sha === commitSha) {
          console.log(
            "Push successful: remote branch now points to the latest commit"
          );
        } else {
          console.log(
            "Push may have failed: remote branch SHA does not match local commit SHA"
          );
        }
      } catch (error) {
        console.error("Error verifying push:", error);
      }

      // Create the pull request
      try {
        const { data: pullRequest } = await octokit.pulls.create({
          owner,
          repo,
          title: `PR from ${currentBranch}`,
          head: currentBranch,
          base: "main", // or your default branch name
          body: "Written with Melty",
        });

        console.log("Pull request created:", pullRequest.html_url);
        vscode.window.showInformationMessage(
          `Pull request created: ${pullRequest.html_url}`
        );
        vscode.env.openExternal(vscode.Uri.parse(pullRequest.html_url));
      } catch (error) {
        console.error(
          "Error creating pull request:",
          JSON.stringify(error, null, 2)
        );

        if (
          (error as Error).message &&
          (error as Error).message.includes("A pull request already exists for")
        ) {
          console.log("Pull request already exists, fetching existing PR");
          try {
            const { data: pulls } = await octokit.pulls.list({
              owner,
              repo,
              head: `${owner}:${currentBranch}`,
              state: "open",
            });

            if (pulls.length > 0) {
              const existingPR = pulls[0];
              console.log("Existing pull request found:", existingPR.html_url);
              vscode.window.showInformationMessage(
                `Existing pull request found. Opening in browser.`
              );
              vscode.env.openExternal(vscode.Uri.parse(existingPR.html_url));
            } else {
              vscode.window.showErrorMessage(
                `No existing open pull request found for branch ${currentBranch}`
              );
            }
          } catch (listError) {
            console.error(
              "Error fetching existing pull requests:",
              JSON.stringify(listError, null, 2)
            );
            vscode.window.showErrorMessage(
              `Failed to fetch existing pull requests: ${
                (listError as Error).message
              }`
            );
          }
        } else {
          vscode.window.showErrorMessage(
            `Failed to create PR: ${(error as Error).message}`
          );
        }
      }
    } catch (error) {
      console.error("Unexpected error:", JSON.stringify(error, null, 2));
      vscode.window.showErrorMessage(
        `An unexpected error occurred: ${(error as Error).message}`
      );
    }
  }

  private getOwnerAndRepo(repository: any): [string, string] | null {
    const remoteUrl =
      repository.state.remotes[0]?.fetchUrl ||
      repository.state.remotes[0]?.pushUrl;
    if (!remoteUrl) {
      console.error("No remote URL found");
      return null;
    }

    console.log("Remote URL:", remoteUrl);

    let match;
    if (remoteUrl.startsWith("https://")) {
      // For HTTPS URLs: https://github.com/owner/repo.git
      match = remoteUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/\.]+)/);
    } else {
      // For SSH URLs: git@github.com:owner/repo.git
      match = remoteUrl.match(/git@github\.com:([^\/]+)\/([^\/\.]+)/);
    }

    if (match && match.length === 3) {
      return [match[1], match[2]];
    } else {
      console.error("Failed to extract owner and repo from URL:", remoteUrl);
      return null;
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
