import { Conversation } from "./conversations";
import * as conversations from "./conversations";
import * as vscode from "vscode";
import { RepoState } from "./repoStates";
import * as repoStates from "./repoStates";
import { Joule, Mode } from "./joules";
import * as utils from "./utils/utils";

/**
 * A Task manages the interaction between a conversation and a git repository
 */
export class Task {
    conversation: Conversation;
    repository: any;

    constructor(
        readonly workspaceRoot: string
    ) {
        this.workspaceRoot = workspaceRoot;
        this.conversation = conversations.create();
        this.repository = null;
    }

    public async init(): Promise<void> {
        if (!this.repository) {
            this.repository = await this.initializeRepository();
        }
    }

    private getConversationState(): RepoState | undefined {
        return conversations.lastJoule(this.conversation)?.repoState;
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
        const latestCommit = this.repository.state.HEAD?.commit;
        if (latestCommit !== conversationTailCommit) {
            throw new Error(`disk is at ${latestCommit} but conversation is at ${conversationTailCommit}`);
        }
    }

    private ensureWorkingDirectoryClean(): void {
        if (!utils.repoIsClean(this.repository)) {
            throw new Error(`Working directory is not clean:
                ${this.repository.state.workingTreeChanges.length}
                ${this.repository.state.indexChanges.length}
                ${this.repository.state.mergeChanges.length}`);
        }
    }

    /**
     * Commits any local changes (or empty commit if none).
     */
    private async commitChanges(): Promise<void> {
        this.ensureInSync();
        const workspaceFileUris = await vscode.workspace.findFiles(
            "**/*",
            "{.git,node_modules}/**"
        );
        const absolutePaths = workspaceFileUris.map((file) => file.fsPath);
        await this.repository.add(absolutePaths);

        if (this.repository.state.indexChanges.length > 0) {
            await this.repository.commit("human changes");
        }
        await this.repository.status();
    }

    /**
     * Responds to a bot message
     */
    public async respondBot(
        contextPaths: string[],
        mode: Mode,
        processPartial: (partialJoule: Joule) => void
    ): Promise<Joule> {
        await this.repository.status();
        this.ensureInSync();
        this.ensureWorkingDirectoryClean();

        this.conversation = await conversations.respondBot(this.conversation, contextPaths, mode, processPartial);
        const lastJoule = conversations.lastJoule(this.conversation)!;

        // actualize does the commit and updates the repoState in-place
        await repoStates.actualize(lastJoule.repoState, this.repository);
        await this.repository.status();

        return lastJoule;
    }

    /**
     * Responds to a human message.
     */
    public async respondHuman(message: string): Promise<Joule> {
        await this.repository.status();

        await this.commitChanges();

        const latestCommit = this.repository.state.HEAD?.commit;
        const newRepoState = repoStates.createFromCommit(this.repository, this.workspaceRoot, latestCommit);

        this.conversation = conversations.respondHuman(
            this.conversation,
            message,
            newRepoState
        );

        return conversations.lastJoule(this.conversation)!;
    }

    /**
    * Gets current repository
    */
    private async initializeRepository() {
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
        return repo;
    }
}
