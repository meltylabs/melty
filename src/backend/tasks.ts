import * as vscode from "vscode";
import { Joule, Mode, Conversation, RepoState, GitRepo } from "../types";
import * as conversations from "./conversations";
import * as repoStates from "./repoStates";
import * as utils from "./utils/utils";

/**
 * A Task manages the interaction between a conversation and a git repository
 */
export class Task {
  conversation: Conversation;
  gitRepo: GitRepo | null;

  constructor() {
    this.conversation = conversations.create();
    this.gitRepo = null;
  }

  public async init(): Promise<void> {
    if (this.gitRepo) {
      return;
    }

    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
      vscode.window.showErrorMessage("Git extension not found");
      throw new Error("Git extension not found");
    }

    const git = gitExtension.exports.getAPI(1);
    const repositories = git.repositories;
    if (repositories.length === 0) {
      vscode.window.showInformationMessage("No Git repository found");
      throw new Error("No Git repository found");
    }
    const repo = repositories[0];
    await repo.status();

    this.gitRepo = { repository: repo, rootPath: repo.rootUri.fsPath };
  }

  private getConversationState(): RepoState | undefined {
    return conversations.lastJoule(this.conversation)?.repoState;
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
    const conversationTailCommit = repoStates.commit(conversationState);
    const latestCommit = this.gitRepo!.repository.state.HEAD?.commit;
    if (latestCommit !== conversationTailCommit) {
      throw new Error(
        `disk is at ${latestCommit} but conversation is at ${conversationTailCommit}`
      );
    }
  }

  private ensureWorkingDirectoryClean(): void {
    if (!utils.repoIsClean(this.gitRepo!.repository)) {
      throw new Error(`Working directory is not clean:
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
    const workspaceFileUris = await vscode.workspace.findFiles(
      "**/*",
      "{.git,node_modules}/**"
    );
    const absolutePaths = workspaceFileUris.map((file) => file.fsPath);
    await this.gitRepo!.repository.add(absolutePaths);

    const changes = this.gitRepo!.repository.state.indexChanges;

    if (changes.length > 0) {
      await this.gitRepo!.repository.commit("human changes");
    }
    await this.gitRepo!.repository.status();

    return changes.length;
  }

  /**
   * Responds to a bot message
   */
  public async respondBot(
    contextPaths: string[],
    mode: Mode,
    processPartial: (partialJoule: Joule) => void
  ): Promise<Joule> {
    await this.gitRepo!.repository.status();
    this.ensureInSync();
    this.ensureWorkingDirectoryClean();

    this.conversation = await conversations.respondBot(
      this.conversation,
      this.gitRepo!,
      contextPaths,
      mode,
      processPartial
    );
    const lastJoule = conversations.lastJoule(this.conversation)!;

    // actualize does the commit and updates the repoState in-place
    await repoStates.actualize(lastJoule.repoState, this.gitRepo!);
    await this.gitRepo!.repository.status();

    return lastJoule;
  }

  /**
   * Responds to a human message.
   */
  public async respondHuman(message: string): Promise<Joule> {
    await this.gitRepo!.repository.status();

    const numFilesChanged = await this.commitChanges();

    const latestCommit = this.gitRepo!.repository.state.HEAD?.commit;
    const newRepoState = repoStates.createFromCommit(latestCommit, numFilesChanged > 0);

    this.conversation = conversations.respondHuman(
      this.conversation,
      message,
      newRepoState
    );

    return conversations.lastJoule(this.conversation)!;
  }
}
