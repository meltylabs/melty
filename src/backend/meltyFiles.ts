import * as path from "path";

import { MeltyFile } from "../types";

export function relativePath(file: MeltyFile): string {
  return file.relPath;
}

export function absolutePath(file: MeltyFile, root: string): string {
  return path.join(root, file.relPath);
}

export function contents(file: MeltyFile): string {
  return file.contents;
}

export function create(path: string, contents: string): MeltyFile {
  return { relPath: path, contents };
}
