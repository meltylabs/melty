import * as path from "path";

export type MeltyFile = {
    readonly path: string;
    readonly contents: string;
    readonly workspaceRoot: string;
};

export function relativePath(file: MeltyFile): string {
    return file.path;
}

export function absolutePath(file: MeltyFile): string {
    return path.join(file.workspaceRoot, file.path);
}

export function contents(file: MeltyFile): string {
    return file.contents;
}

export function create(path: string, contents: string, workspaceRoot: string): MeltyFile {
    return { path, contents, workspaceRoot };
}