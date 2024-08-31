import { Uri, Webview } from "vscode";
import * as vscode from "vscode";
import * as config from "./config";
import * as path from "path";
import { GitRepo } from "../types";
import { Task } from "../backend/tasks";
import { ChangeSet } from "../types";
import * as os from "os";
import * as diff from "diff";

export function meltyBranchNameFromTaskName(taskName: string): string {
	const rnd = Math.random().toString(16).substring(2, 8);
	const sanitizedTaskName = taskName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 12);
	return `melty/${rnd}_${sanitizedTaskName}`;
}

export function error(message: string) {
	vscode.window.showErrorMessage(message);
	throw new Error(message);
}

export function info(message: string) {
	console.info(message);
	vscode.window.showInformationMessage(message);
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

