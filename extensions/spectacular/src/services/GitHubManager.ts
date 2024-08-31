import * as vscode from 'vscode';
import { GitManager } from "./GitManager";
import { Octokit } from '@octokit/rest';

export class GitHubManager {
	private static instance: GitHubManager | null = null;

	private constructor(
		private readonly _gitManager: GitManager = GitManager.getInstance()
	) { }

	public static getInstance(): GitHubManager {
		if (!GitHubManager.instance) {
			GitHubManager.instance = new GitHubManager();
		}
		return GitHubManager.instance;
	}

	private getOwnerAndRepo(): [string, string] | null {
		try {
			const remote = this._gitManager.getMeltyRemote();
			const anyUrl = remote?.fetchUrl || remote?.pushUrl;
			if (!anyUrl) {
				throw new Error('No remote URL found');
			}
			let match;
			if (anyUrl.startsWith('https://')) {
				match = anyUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/\.]+)/);
			} else {
				match = anyUrl.match(/git@github\.com:([^\/]+)\/([^\/\.]+)/);
			}
			if (match && match.length === 3) {
				return [match[1], match[2]];
			}
			throw new Error('Failed to extract owner and repo from URL');
		} catch (error) {
			console.error('Error getting owner and repo:', error);
			return null;
		}
	}

	public async createPullRequest() {
		try {
			const currentBranch = this._gitManager.getCurrentBranch();
			const commitSha = await this._gitManager.getLatestCommitHash();
			if (!currentBranch || !commitSha) {
				vscode.window.showErrorMessage(`Failed to get git info: ${currentBranch}, ${commitSha}`);
				return;
			}

			console.log("Current branch:", currentBranch);
			console.log("Latest commit SHA:", commitSha);

			const token = vscode.workspace
				.getConfiguration()
				.get("melty.githubToken");

			if (!token) {
				vscode.window.showErrorMessage(
					"No GitHub token found. Please set the melty.githubToken setting."
				);
				return;
			}

			const ownerAndRepo = this.getOwnerAndRepo();
			if (!ownerAndRepo) {
				vscode.window.showErrorMessage(
					"Failed to determine owner and repo from remote URL"
				);
				return;
			}
			const [owner, repo] = ownerAndRepo;

			console.log("Owner:", owner);
			console.log("Repo:", repo);

			const octokit = new Octokit({ auth: token });

			// Check if branch exists on GitHub
			let branchExists = false;
			try {
				const { data: ref } = await octokit.git.getRef({
					owner,
					repo,
					ref: `heads/${currentBranch}`,
				});
				branchExists = true;
				console.log("Remote branch exists:", ref.ref);
			} catch (error) {
				if ((error as any).status === 404) {
					console.log("Remote branch does not exist, will create new");
				} else {
					console.error("Error checking remote branch:", error);
				}
			}

			// Ensure the commit exists on the remote
			try {
				await octokit.git.getCommit({
					owner,
					repo,
					commit_sha: commitSha,
				});
				console.log("Commit exists on remote");
			} catch (error) {
				if ((error as any).status === 404) {
					console.log("Commit does not exist on remote, pushing changes");
					await this._gitManager.pushToMeltyRemote(currentBranch);
				} else {
					console.error("Error checking commit:", error);
					throw error;
				}
			}

			// Create or update the branch
			try {
				if (branchExists) {
					const result = await octokit.git.updateRef({
						owner,
						repo,
						ref: `heads/${currentBranch}`,
						sha: commitSha,
						force: true,
					});
					console.log("Branch updated:", result.data.ref);
				} else {
					const result = await octokit.git.createRef({
						owner,
						repo,
						ref: `refs/heads/${currentBranch}`,
						sha: commitSha,
					});
					console.log("Branch created:", result.data.ref);
				}
			} catch (error) {
				console.error(
					"Error creating/updating branch:",
					JSON.stringify(error, null, 2)
				);
				if ((error as any).response) {
					console.error(
						"Error response:",
						JSON.stringify((error as any).response.data, null, 2)
					);
				}
				throw error;
			}

			// Verify the push was successful
			try {
				const { data: ref } = await octokit.git.getRef({
					owner,
					repo,
					ref: `heads/${currentBranch}`,
				});
				console.log("Branch ref after push:", ref.ref);
				console.log("Branch SHA after push:", ref.object.sha);
				if (ref.object.sha === commitSha) {
					console.log(
						"Push successful: remote branch now points to the latest commit"
					);
				} else {
					console.log(
						"Push may have failed: remote branch SHA does not match local commit SHA"
					);
				}
			} catch (error) {
				console.error("Error verifying push:", error);
			}

			// Create the pull request
			try {
				const { data: pullRequest } = await octokit.pulls.create({
					owner,
					repo,
					title: `PR from ${currentBranch}`,
					head: currentBranch,
					base: "main", // or your default branch name
					body: "Written with Melty",
				});

				console.log("Pull request created:", pullRequest.html_url);
				vscode.window.showInformationMessage(
					`Pull request created: ${pullRequest.html_url}`
				);
				vscode.env.openExternal(vscode.Uri.parse(pullRequest.html_url));
			} catch (error) {
				console.error(
					"Error creating pull request:",
					JSON.stringify(error, null, 2)
				);

				if (
					(error as Error).message &&
					(error as Error).message.includes("A pull request already exists for")
				) {
					console.log("Pull request already exists, fetching existing PR");
					try {
						const { data: pulls } = await octokit.pulls.list({
							owner,
							repo,
							head: `${owner}:${currentBranch}`,
							state: "open",
						});

						if (pulls.length > 0) {
							const existingPR = pulls[0];
							console.log("Existing pull request found:", existingPR.html_url);
							vscode.window.showInformationMessage(
								`Existing pull request found. Opening in browser.`
							);
							vscode.env.openExternal(vscode.Uri.parse(existingPR.html_url));
						} else {
							vscode.window.showErrorMessage(
								`No existing open pull request found for branch ${currentBranch}`
							);
						}
					} catch (listError) {
						console.error(
							"Error fetching existing pull requests:",
							JSON.stringify(listError, null, 2)
						);
						vscode.window.showErrorMessage(
							`Failed to fetch existing pull requests: ${(listError as Error).message
							}`
						);
					}
				} else {
					vscode.window.showErrorMessage(
						`Failed to create PR: ${(error as Error).message}`
					);
				}
			}
		} catch (error) {
			console.error("Unexpected error:", JSON.stringify(error, null, 2));
			vscode.window.showErrorMessage(
				`An unexpected error occurred: ${(error as Error).message}`
			);
		}
	}
}
