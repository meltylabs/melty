import { Uri } from "vscode";
import { MeltyFile } from "./meltyFiles";
import * as files from "./meltyFiles";

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
    readonly files: { [relativePath: string]: MeltyFile };
    readonly parent_commit: string | undefined;
};

export function forEachFile(repoState: RepoState, fn: (file: MeltyFile) => void): void {
    // TODO think more about return type here
    if (repoState.state.status === "inMemory") {
        Object.entries(repoState.state.files).forEach(([_path, file]) => fn(file));
    } else {
        // TODO
        throw new Error("not implemented: getFileContents from committed repostate");
    }
}

export function hasFile(repoState: RepoState, path: string): boolean {
    if (repoState.state.status === "inMemory") {
        return path in repoState.state.files;
    } else {
        // TODO
        throw new Error("not implemented: getFileContents from committed repostate");
    }
}

export function getFileContents(repoState: RepoState, path: string): string {
    if(repoState.state.status === "inMemory") {
        return files.contents(repoState.state.files[path]);
    } else {
        // TODO
        throw new Error("not implemented: getFileContents from committed repostate");
    }
}

export function create(files: { [relativePath: string]: MeltyFile }, parent_commit: string | undefined, workspaceRoot: string): RepoState {
    const repoStateInMemory: RepoStateInMemory = { status: "inMemory", files: files, parent_commit: parent_commit || "", workspaceRoot: workspaceRoot };
    return { state: repoStateInMemory };
}

export function createFromCommit(commit: string): RepoState {
    // TODO
    throw new Error("not implemented: createFromCommit");
}

export function upsertFileContents(repoState: RepoState, path: string, contents: string): RepoState {
    if(repoState.state.status === "inMemory") {
        const file = files.create(path, contents, repoState.state.workspaceRoot);
        return { state: { ...repoState.state, files: { ...repoState.state.files, [path]: file } } };
    } else {
        throw new Error("not implemented: upsertFileContents from committed repostate");
    }
}

export function realize(repoState: RepoState): RepoState {
    if(repoState.state.status === "committed") {
        return repoState;
    } else {
        const files = repoState.state.files;
        // TODO commit files
        const commit = "123";
        const repoStateCommitted: RepoStateCommitted = { status: "committed", commit };
        return { state: repoStateCommitted };
    }
}