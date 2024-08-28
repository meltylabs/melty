import * as vscode from "vscode";
import { GitRepo } from "../types";

export async function getRepoAtWorkspaceRoot(): Promise<GitRepo | string> {
	const gitExtension = vscode.extensions.getExtension("vscode.git");
	if (!gitExtension) {
		return "Git extension not found";
	}

	const git = gitExtension.exports.getAPI(1);
	const repositories = git.repositories;
	if (!repositories.length) {
		return "No git repositories found";
	}

	// Get the VSCode workspace root path
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceRoot) {
		return "No workspace folder found";
	}

	// Find the repository that matches the workspace root
	const repo = repositories.find(
		(r: any) => r.rootUri.fsPath === workspaceRoot
	);
	if (!repo) {
		return "No git repository found at workspace root";
	}

	await repo.status();

	return { repository: repo, rootPath: repo.rootUri.fsPath };
}

