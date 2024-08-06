import * as path from "path";

import { MeltyFile } from '../types';

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
