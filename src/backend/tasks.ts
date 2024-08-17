import * as vscode from "vscode";
import {
  Joule,
  Conversation,
  PseudoCommit,
  GitRepo,
  AssistantType,
} from "../types";
import * as conversations from "./conversations";
import * as joules from "./joules";
import * as pseudoCommits from "./pseudoCommits";
import * as utils from "../util/utils";
import { Architect } from "../assistants/architect";
import { Coder } from "../assistants/coder";
import * as config from "../util/config";
import { FileManager } from "../fileManager";
import { getRepoAtWorkspaceRoot } from "../util/gitUtils";
import * as datastores from "./datastores";

/**
 * A Task manages the interaction between a conversation and a git repository
 */
export class Task implements Task {
  conversation: Conversation;
  gitRepo: GitRepo | null;
  fileManager: FileManager | undefined;
  createdAt: Date;
  updatedAt: Date;
  savedMeltyMindFiles: string[] = [];

  constructor(public id: string, public name: string, public branch: string) {
    this.conversation = conversations.create();
    this.gitRepo = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updateLastModified() {
    this.updatedAt = new Date();
  }

  public setFileManager(fileManager: FileManager) {
    this.fileManager = fileManager;
  }

  /**
   * Initializes the GitRepo's repository field. Note that if the GitRepo has only a rootPath,
   * then we still need to run `init` to populate the repository field.
   */
  public async init(): Promise<boolean> {
    if (this.gitRepo && this.gitRepo.repository) {
      return true;
    }

    const result = await getRepoAtWorkspaceRoot();
    if (typeof result === "string") {
      console.log(`Could not initialize task: ${result}`);
      return false;
    }

    this.gitRepo = result;
    console.log(`Initialized task ${this.id}`);
    return true;
  }

  // public async switchTo(): Promise<void> {
  //   await this.init();
  //   await this.gitRepo!.repository.status();

  //   if (!utils.repoIsClean(this.gitRepo!.repository)) {
  //     utils.handleGitError(
  //       "Working directory is not clean. Cannot proceed activating task."
  //     );
  //   } else {
  //     try {
  //       await this.gitRepo!.repository.checkout(this.branch);
  //       utils.info(`Switched to branch ${this.branch}`);
  //     } catch (error: any) {
  //       if (
  //         error.stderr &&
  //         error.stderr.includes("did not match any file(s) known to git")
  //       ) {
  //         // we need to create the branch
  //         if (!utils.repoIsOnMain(this.gitRepo!.repository)) {
  //           utils.handleGitError(
  //             "Cannot activate task: working directory is not on main branch"
  //           );
  //         }
  //         console.log(`Branch ${this.branch} does not exist. Creating it.`);
  //         await this.gitRepo!.repository.createBranch(this.branch, true);
  //         utils.info(`Created and checked out branch ${this.branch}`);
  //       } else {
  //         // Re-throw other errors
  //         throw error;
  //       }
  //     }
  //   }
  // }

  private getConversationState(): PseudoCommit | undefined {
    return conversations.lastJoule(this.conversation)?.pseudoCommit;
  }

  /**
   * Lists Joules in a Task.
   */
  public listJoules(): readonly Joule[] {
    return this.conversation.joules;
  }

  /**
   * Ensures that the last message in the conversation has the same commit id as the latest commit
   * on disk. Allows for local changes.
   */
  private ensureInSync(): void {
    const conversationState = this.getConversationState();
    if (!conversationState) {
      return; // if the conversation is empty, we're in sync
    }
    const conversationTailCommit = pseudoCommits.commit(conversationState);
    const latestCommit = this.gitRepo!.repository.state.HEAD?.commit;
    if (latestCommit !== conversationTailCommit) {
      utils.handleGitError(
        `disk is at ${latestCommit} but conversation is at ${conversationTailCommit}`
      );
    }
  }

  private ensureWorkingDirectoryClean(): void {
    if (!utils.repoIsClean(this.gitRepo!.repository)) {
      utils.handleGitError(`Working directory is not clean:
                ${this.gitRepo!.repository.state.workingTreeChanges.length}
                ${this.gitRepo!.repository.state.indexChanges.length}
                ${this.gitRepo!.repository.state.mergeChanges.length}`);
    }
  }

  /**
   * Commits any local changes (or empty commit if none).
   * @returns the number of changes committed
   */
  private async commitChanges(): Promise<number> {
    this.ensureInSync();

    // Get all changes, including untracked files
    const changes = await this.gitRepo!.repository.diffWithHEAD();

    // Filter out ignored files
    const nonIgnoredChanges = changes.filter(
      (change: any) => !change.gitIgnored
    );

    // Add only non-ignored files
    await this.gitRepo!.repository.add(
      nonIgnoredChanges.map((change: any) => change.uri.fsPath)
    );

    const indexChanges = this.gitRepo!.repository.state.indexChanges;

    if (indexChanges.length > 0) {
      await this.gitRepo!.repository.commit("human changes");
    }

    await this.gitRepo!.repository.status();
    return indexChanges.length;
  }

  /**
   * Responds to a bot message
   *
   * @param contextPaths - the paths to the files in the context of which to respond (melty's mind)
   * @param mode - the mode of the assistant to use
   * @param processPartial - a function to process the partial joule
   */
  public async respondBot(
    assistantType: AssistantType,
    processPartial: (partialConversation: Conversation) => void
  ): Promise<void> {
    try {
      await this.gitRepo!.repository.status();
      this.ensureInSync();
      this.ensureWorkingDirectoryClean();

      let assistant;
      switch (assistantType) {
        case "coder":
          assistant = new Coder();
          break;
        case "architect":
          assistant = new Architect();
          break;
        default:
          throw new Error(`Unknown assistant type: ${assistantType}`);
      }

      const meltyMindFiles =
        await this.fileManager!.getMeltyMindFilesRelative();
      this.conversation = await assistant.respond(
        this.conversation,
        this.gitRepo!,
        meltyMindFiles,
        processPartial
      );
      const lastJoule = conversations.lastJoule(this.conversation)!;

      // add any edited files to melty's mind
      const editedFiles = pseudoCommits.getEditedFiles(lastJoule.pseudoCommit);
      editedFiles.forEach((editedFile) => {
        this.fileManager!.addMeltyMindFile(editedFile, true);
      });

      // actualize does the commit and updates the pseudoCommit in-place
      await pseudoCommits.actualize(
        lastJoule.pseudoCommit,
        this.gitRepo!,
        assistantType !== "architect"
      );
      await this.gitRepo!.repository.status();

      this.updateLastModified();
      await datastores.dumpTaskToDisk(this);
    } catch (e) {
      if (config.DEV_MODE) {
        throw e;
      } else {
        vscode.window.showErrorMessage(`Error talking to the bot: ${e}`);
        const joule = joules.createJouleBot(
          "[  Error :(  ]",
          "[ There was an error communicating with the bot. ]",
          pseudoCommits.createFromPrevious(
            conversations.lastJoule(this.conversation)!.pseudoCommit
          ),
          [],
          "system"
        );
        this.conversation = conversations.addJoule(this.conversation, joule);
      }
    }
  }

  /**
   * Responds to a human message.
   */
  public async respondHuman(
    assistantType: AssistantType,
    message: string
  ): Promise<Joule> {
    let associateDiffWithPseudoCommit = false;

    if (assistantType !== "architect") {
      await this.gitRepo!.repository.status();
      const didCommit = (await this.commitChanges()) > 0;
      associateDiffWithPseudoCommit = didCommit;
    }

    // if using the architect, this commit will be old, but it
    // shouldn't matter because we never read from it anyway
    const latestCommit = this.gitRepo!.repository.state.HEAD?.commit;
    const newPseudoCommit = await pseudoCommits.createFromCommit(
      latestCommit,
      this.gitRepo!,
      associateDiffWithPseudoCommit
    );

    this.conversation = conversations.respondHuman(
      this.conversation,
      message,
      newPseudoCommit
    );

    this.updateLastModified();
    await datastores.dumpTaskToDisk(this);

    return conversations.lastJoule(this.conversation)!;
  }

  /**
   * goes to a plain JSON object that can be passed to JSON.stringify
   */
  public serialize(): any {
    return {
      ...this,
      gitRepo: {
        ...this.gitRepo,
        repository: null,
      },
      fileManager: null,
      savedMeltyMindFiles: this.fileManager
        ? this.fileManager.dumpMeltyMindFiles()
        : undefined,
    };
  }

  public static deserialize(serializedTask: any): Task {
    const task = Object.assign(
      new Task(serializedTask.id, "", ""),
      serializedTask
    ) as Task;

    task.fileManager = undefined;

    return task;
  }
}
