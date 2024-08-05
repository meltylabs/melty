import { Uri } from "vscode";
import { MeltyFile } from "./meltyFiles";
import * as files from "./meltyFiles";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

export type RepoState = {
    state: RepoStateInMemory | RepoStateCommitted;
};

type RepoStateCommitted = {
    readonly status: "committed";
    readonly commit: string;
};

type RepoStateInMemory = {
    readonly status: "inMemory";
    readonly workspaceRoot: string;
    readonly filesChanged: { [relativePath: string]: MeltyFile };
    readonly parentCommit: string;
};

// we want to be able to track RepoStates that we're not on
// but then also to actualize the RepoState
// a RepoState is always fully realizable: either it has a parent commit and a diff (inMemory)
// or else it just has a commit (committed)

// unfortunately, "actualize" isn't really a background operation
// maybe there's a separate GitConversation that keeps git and conversation in sync?
// I like that

export async function diff(repoState: RepoState, repository: any): Promise<string> {
    if (repoState.state.status === "inMemory") {
        throw new Error("not implemented: getDiff from committed repostate");
    } else {
        const repoStateCommitted = repoState.state;
        const commit = repoStateCommitted.commit;
        const diff = await repository.diffBetween(commit + "^", commit);
        const udiffs = await Promise.all(
            diff.map(async (change: any) => {
                return await repository.diffBetween(
                    commit + "^",
                    commit,
                    change.uri.fsPath
                );
            })
        );
        return udiffs.join("\n");
    }
}

export function parentCommit(repoState: RepoState): string | undefined {
    if (repoState.state.status === "inMemory") {
        return repoState.state.parentCommit;
    } else {
        return undefined;
    }
}

export function commit(repoState: RepoState): string | undefined {
    if (repoState.state.status === "committed") {
        return repoState.state.commit;
    } else {
        return undefined;
    }
}

/**
 * Puts files in this repo state onto disk and creates a commit for them if there isn't one yet.
 * Out of caution, it will error if there are uncommitted changes, and it may error
 *   if git is not already on this repoState's parent (only if changes were previously in memory).
 * Returns a new repoState that is guaranteed to track the new commit.
 */
export async function actualize(repoState: RepoState, repository: any): Promise<void> {
    await repository.status();
    // check for uncommitted changes
    if (repository.state.workingTreeChanges.length > 0 ||
        repository.state.indexChanges.length > 0 ||
        repository.state.mergeChanges.length > 0) {
        throw new Error("Please commit or stash changes before actualizing");
    }

    if (repoState.state.status === "committed") {
        const repoStateCommitted = repoState.state;
        await repository.checkout(repoStateCommitted.commit);
        // no update to repoState needed
    } else {
        const repoStateInMemory = repoState.state;

        const latestCommit = repository.state.HEAD?.commit;
        if (latestCommit !== repoStateInMemory.parentCommit) {
            throw new Error(`Please move to ${repoStateInMemory.parentCommit} before actualizing`);
        }

        const filesChanged = repoStateInMemory.filesChanged;
        Object.entries(filesChanged).forEach(([_path, file]) => {
            fs.mkdirSync(path.dirname(files.absolutePath(file)), {
                recursive: true,
            });
            fs.writeFileSync(files.absolutePath(file), files.contents(file));
        });

        await repository.add(Object.values(filesChanged).map((file) => files.absolutePath(file)));
        await repository.commit("bot changes", { empty: true });

        await repository.status();
        const newCommit = repository.state.HEAD!.commit;
        const repoStateCommitted: RepoStateCommitted = { status: "committed", commit: newCommit };

        // update repoState in place
        repoState.state = repoStateCommitted;
    }
}

// function actualize(repoState: RepoState): void {
//     if (repoState.state.status === "inMemory") {
//         // if the project's git repo is not on the repostate's parent commit, throw an unimplemented error
//         for (const [path, file] of Object.entries(repoState.state.files)) {
//             fs.writeFileSync(files.absolutePath(file), files.contents(file));
//         }
//     }
// }

// export function forEachFile(repoState: RepoState, fn: (file: MeltyFile) => void): void {
//     if (repoState.state.status === "inMemory") {
//         Object.entries(repoState.state.files).forEach(([_path, file]) => fn(file));
//     } else {
//         // TODO
//         throw new Error("not implemented: getFileContents from committed repostate");
//     }
// }

export function hasFile(repoState: RepoState, filePath: string): boolean {
    if (repoState.state.status === "inMemory") {
        return filePath in repoState.state.filesChanged;
    } else {
        // TODO NO GOOD VERY BAD
        const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
        return fs.existsSync(path.join(workspaceRoot, filePath));
    }
}

export function getFileContents(repoState: RepoState, filePath: string): string {
    if (repoState.state.status === "inMemory") {
        return files.contents(repoState.state.filesChanged[filePath]);
    } else {
        // for now, assume that if it's actualized, we're on that commit. BIG ASSUMPTION! TODO!
        // read the file from disk
        // TODO NO GOOD VERY BAD
        const repoStateCommitted = repoState.state;
        const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
        return fs.readFileSync(path.join(workspaceRoot, filePath), "utf8");
    }
}

export function createCopyParent(parentRepoState: RepoState): RepoState {
    if (parentRepoState.state.status !== "committed") {
        throw new Error("not implemented: createCopyParent from uncommitted repostate");
    }

    const repoStateInMemory: RepoStateInMemory = {
        status: "inMemory",
        filesChanged: {},
        parentCommit: parentRepoState.state.commit,
        workspaceRoot: vscode.workspace.workspaceFolders![0].uri.fsPath
    };
    return { state: repoStateInMemory };
}

export function createFromCommitAndDiff(
    filesChanged: { [relativePath: string]: MeltyFile },
    parentCommit: string,
    workspaceRoot: string
): RepoState {
    const repoStateInMemory: RepoStateInMemory = {
        status: "inMemory",
        filesChanged: filesChanged,
        parentCommit: parentCommit,
        workspaceRoot: workspaceRoot
    };
    return { state: repoStateInMemory };
}

export function createFromCommit(commit: string): RepoState {
    return { state: { status: "committed", commit } };
}

export function upsertFileContents(repoState: RepoState, path: string, contents: string): RepoState {
    if (repoState.state.status === "inMemory") {
        const file = files.create(path, contents, repoState.state.workspaceRoot);
        return { state: { ...repoState.state, filesChanged: { ...repoState.state.filesChanged, [path]: file } } };
    } else {
        throw new Error("not implemented: upsertFileContents from committed repostate");
    }
}
