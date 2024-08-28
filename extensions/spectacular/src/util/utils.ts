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
	commit: string | undefined
): Promise<string | null> {
	const repository = gitRepo.repository;

	try {
		// Check if there are any commits in the repository
		const headCommit = await repository.getCommit('HEAD').catch(() => null);

		if (!headCommit) {
			// No commits in the repository yet
			return null;
		}

		if (!commit) {
			// If commit is undefined, use the current HEAD
			commit = headCommit.hash;
		}

		// Check if the commit has exactly one parent
		const hasOneParent = await repository.getCommit(commit).then(
			async (commitObj: any) => {
				return commitObj.parents?.length === 1;
			}
		);

		if (!hasOneParent) {
			return "";
		}

		const baseCommit = commit + "^"; // empty tree

		const diff = await repository.diffBetween(baseCommit, commit);
		const udiffs = await Promise.all(
			diff.map(async (change: any) => {
				return await repository.diffBetween(
					baseCommit,
					commit,
					change.uri.fsPath
				);
			})
		);
		return udiffs.join("\n");
	} catch (error) {
		console.error(`Error getting diff for commit ${commit}:`, error);
		return "";
	}
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

export function findLongestPrefixMatch(
	text: string,
	search: string,
	nonMatchLength: number = 5
): { match: string; nonMatch: string } {
	let prefixLength = 0;
	while (
		prefixLength < search.length &&
		text.includes(search.slice(0, prefixLength + 1))
	) {
		prefixLength++;
	}
	const match = search.slice(0, prefixLength);
	const nonMatch = search.slice(prefixLength, prefixLength + nonMatchLength);
	return { match, nonMatch };
}

