import * as vscode from "vscode";
import { Joule, Mode, Conversation, PseudoCommit, GitRepo } from "../types";
import * as conversations from "./conversations";
import * as joules from "./joules";
import * as pseudoCommits from "./pseudoCommits";
import * as utils from "./utils/utils";
import { Architect } from "../assistants/architect";
import { Coder } from "../assistants/coder";
/**
 * A Task manages the interaction between a conversation and a git repository
 */
export class Task {
  id: string;
  branch: string;
  conversation: Conversation;
  gitRepo: GitRepo | null;

  constructor(id: string, branch: string) {
    this.id = id;
    this.branch = branch;
    this.conversation = conversations.create();
    this.gitRepo = null;
  }

  /**
   * Initializes the git repo.
   */
  public async init(): Promise<boolean> {
    if (this.gitRepo) {
      return true;
    }

    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
      console.log("Could not initialize task: git extension not found");
      return false;
    }

    const git = gitExtension.exports.getAPI(1);
    const repositories = git.repositories;
    if (!repositories.length) {
      console.log("Could not initialize task: no git repository found");
      return false;
    }
    const repo = repositories[0];
    await repo.status();

    this.gitRepo = { repository: repo, rootPath: repo.rootUri.fsPath };
    return true;
  }

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
    // const conversationState = this.getConversationState();
    // if (!conversationState) {
    //   return; // if the conversation is empty, we're in sync
    // }
    // const conversationTailCommit = pseudoCommits.commit(conversationState);
    // const latestCommit = this.gitRepo!.repository.state.HEAD?.commit;
    // if (latestCommit !== conversationTailCommit) {
    //   throw new Error(
    //     `disk is at ${latestCommit} but conversation is at ${conversationTailCommit}`
    //   );
    // }
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

    // Get all changes, including untracked files
    const changes = await this.gitRepo!.repository.diffWithHEAD();

    // Filter out ignored files
    const nonIgnoredChanges = changes.filter(
      (change: any) => !change.gitIgnored
    );

    // Add only non-ignored files
    for (const change of nonIgnoredChanges) {
      // disable even this, for now, because it's not working --
      // stack trace: TypeError: e.map is not a function
      // at d.add(/Applications/Cursor.app / Contents / Resources / app / extensions / git / dist / main.js: 2: 789949)
      // at Task.commitChanges(/Users/jacksondc / Development / melty_run / out / extension.js: 227915: 37)
      // at async Task.respondHuman(/Users/jacksondc / Development / melty_run / out / extension.js: 227948: 23)
      // at async HelloWorldPanel.handleAskCode(/Users/jacksondc / Development / melty_run / out / extension.js: 223370: 5)
      // at async c.value(/Users/jacksondc / Development / melty_run / out / extension.js: 223335: 13)
      // await this.gitRepo!.repository.add(change.uri.fsPath);
    }

    const indexChanges = this.gitRepo!.repository.state.indexChanges;

    if (indexChanges.length > 0) {
      await this.gitRepo!.repository.commit("human changes");
    }

    await this.gitRepo!.repository.status();
    return changes.length;
  }

  /**
   * Responds to a bot message
   *
   * @param contextPaths - the paths to the files in the context of which to respond (melty's mind)
   * @param mode - the mode of the assistant to use
   * @param processPartial - a function to process the partial joule
   */
  public async respondBot(
    contextPaths: string[],
    mode: Mode,
    processPartial: (partialJoule: Joule) => void
  ): Promise<Joule> {
    try {
      await this.gitRepo!.repository.status();
      // this.ensureInSync();
      // this.ensureWorkingDirectoryClean();

      let assistant;
      switch (mode) {
        case "code":
          assistant = new Coder();
          break;
        case "ask":
          assistant = new Architect();
        default:
          assistant = new Architect();
      }

      this.conversation = await assistant.respond(
        this.conversation,
        this.gitRepo!,
        contextPaths,
        mode,
        processPartial
      );
      const lastJoule = conversations.lastJoule(this.conversation)!;

      // actualize does the commit and updates the pseudoCommit in-place
      await pseudoCommits.actualize(lastJoule.pseudoCommit, this.gitRepo!);
      await this.gitRepo!.repository.status();

      return lastJoule;
    } catch (e) {
      vscode.window.showErrorMessage(`Error talking to the bot: ${e}`);

      const joule = joules.createJouleBot(
        "[  Error :(  ]",
        mode,
        pseudoCommits.createDummy(),
        contextPaths
      );
      this.conversation = conversations.addJoule(this.conversation, joule);
      return joule;
    }
  }

  /**
   * Responds to a human message.
   */
  public async respondHuman(message: string): Promise<Joule> {
    await this.gitRepo!.repository.status();

    const didCommit = (await this.commitChanges()) > 0;

    const latestCommit = this.gitRepo!.repository.state.HEAD?.commit;
    const newPseudoCommit = await pseudoCommits.createFromCommit(
      latestCommit,
      this.gitRepo!,
      didCommit
    );

    this.conversation = conversations.respondHuman(
      this.conversation,
      message,
      newPseudoCommit
    );

    return conversations.lastJoule(this.conversation)!;
  }
}
