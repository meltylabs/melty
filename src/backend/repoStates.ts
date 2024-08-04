import { Uri } from "vscode";

export type FileSet = { [path: string]: string };

export type RepoState = {
    state: RepoStateInMemory | RepoStateCommitted;
};

type RepoStateCommitted = {
    readonly status: "committed";
    readonly commit: string;
};

type RepoStateInMemory = {
    readonly status: "inMemory";
    readonly files: FileSet;
    readonly parent_commit: string;
};

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
        return repoState.state.files[path];
    } else {
        // TODO
        throw new Error("not implemented: getFileContents from committed repostate");
    }
}

export function create(files: FileSet, parent_commit: string): RepoState {
    const repoStateInMemory: RepoStateInMemory = { status: "inMemory", files: files, parent_commit };
    return { state: repoStateInMemory };
}

export function upsertFileContents(repoState: RepoState, path: string, contents: string): RepoState {
    if(repoState.state.status === "inMemory") {
        return { state: { ...repoState.state, files: { ...repoState.state.files, [path]: contents } } };
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