import { Uri, Webview } from "vscode";
import * as vscode from "vscode";
import * as config from "./config";
import * as path from "path";
import { GitRepo } from "../types";
import { Task } from "../backend/tasks";
import { ChangeSet } from "../types";
import * as os from "os";
import * as diff from "diff";

export function handleGitError(message: string) {
  if (config.STRICT_GIT) {
    error(message);
  } else {
    console.log(message);
  }
}

export function error(message: string) {
  vscode.window.showErrorMessage(message);
  throw new Error(message);
}

export function info(message: string) {
  console.info(message);
  vscode.window.showInformationMessage(message);
}

export function repoIsClean(repository: any) {
  return (
    !repository.state.workingTreeChanges.length &&
    !repository.state.indexChanges.length &&
    !repository.state.mergeChanges.length
  );
}

export function repoIsOnMain(repo: any) {
  return repo.state.HEAD?.name === "main";
}

export function ensureRepoIsOnCommit(repo: any, commit: string) {
  if (repo.state.HEAD?.commit !== commit) {
    handleGitError(
      `Expected repo to be on commit ${commit} but found ${repo.state.HEAD?.commit}`
    );
  }
}

export function serialize(task: Task) {
  return {
    ...task,
    gitRepo: {
      ...task.gitRepo,
      repository: null,
    },
    workspaceFiles: null,
  };
}

/**
 * Get all the file paths in the workspace. Get their paths relative to the root of a git repo
 * @param gitRepo
 * @returns
 */
export async function getWorkspaceFilePaths(gitRepo: GitRepo) {
  const workspaceFileUris = await vscode.workspace.findFiles(
    "**/*",
    config.getExcludesGlob()
  );
  return workspaceFileUris.map((file) => {
    return path.relative(gitRepo.rootPath, file.fsPath);
  });
}

export function getUri(
  webview: Webview,
  extensionUri: Uri,
  pathList: string[]
) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function resolveTildePath(path: string): string {
  if (path.startsWith("~/") || path === "~") {
    return path.replace("~", os.homedir());
  }
  return path;
}

/**
 * Gets the diff of working changes against HEAD
 */
export async function getUdiffFromWorking(gitRepo: GitRepo): Promise<string> {
  const repository = gitRepo.repository;
  return await repository.diff("HEAD");
}

/**
 * Gets the diff from a commit to its parent
 */
export async function getUdiffFromCommit(
  gitRepo: GitRepo,
  commit: string
): Promise<string> {
  const repository = gitRepo.repository;
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

/**
 * Gets diff preview for a change set (NOT a udiff bc this is easier)
 */
export function getUdiffFromChangeSet(changeSet: ChangeSet): string {
  return Object.entries(changeSet.filesChanged)
    .map(([filePath, { original, updated }]) => {
      return diff.createPatch(filePath, original.contents, updated.contents);
    })
    .join("\n");
}
