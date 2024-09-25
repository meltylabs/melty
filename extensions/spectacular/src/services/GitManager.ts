import * as vscode from 'vscode';

// TODOREFACTOR get these imports out of here
import { generateCommitMessage } from '../backend/commitMessageGenerator';
import { ChangeSet, CodeInfo, MeltyContext } from 'types';
import * as changesets from 'backend/changeSets';
import * as files from 'backend/meltyFiles';
import path from 'path';
import { ContextProvider } from 'services/ContextProvider';

type Repo = {
	sitory: any;
};

/**
 * All public methods wrapped in try/catch and return sensible defaults in the error case!
 * GitManager manages not just git, but also the workspace root. Probably those things should
 * be separated at some point.
 */
export class GitManager {
	private static instance: GitManager | null = null;

	private repo: Repo | undefined = undefined;

	public constructor(
		private readonly _contextProvider: ContextProvider = ContextProvider.getInstance()
	) { }

	public static getInstance(): GitManager {
		if (!GitManager.instance) {
			GitManager.instance = new GitManager();
		}
		return GitManager.instance;
	}

	/**
	 * Commits any local changes (or empty commit if none).
	 * @returns info if changes were committed, or null otherwise
	 */
	public async commitLocalChanges(): Promise<CodeInfo | null> {
		try {
			await this.repo!.sitory.status();

			// Get all changes, including untracked files
			const changes = await this.repo!.sitory.diffWithHEAD();

			// Filter out ignored files
			const nonIgnoredChanges = changes.filter(
				(change: any) => !change.gitIgnored
			);

			// Add only non-ignored files
			await this.repo!.sitory.add(
				nonIgnoredChanges.map((change: any) => change.uri.fsPath)
			);

			const indexChanges = this.repo!.sitory.state.indexChanges;

			if (indexChanges.length > 0) {
				const udiffPreview = await this.getUdiffFromWorking();
				const message = await generateCommitMessage(udiffPreview);

				await this.repo!.sitory.commit(`${message}`);
				await this.repo!.sitory.status();
				const commitHash = this.getLatestCommitHash()!;

				return {
					commit: commitHash,
					diffInfo: {
						diffPreview: udiffPreview,
						filePathsChanged: indexChanges.map(
							(change: any) => change.uri.fsPath
						),
					}
				};
			} else {
				return null;
			}
		} catch (error) {
			console.error('Error comitting local changes', error);
			return null;
		}
	}

	/**
	 * Commits changes in a changeset
	 * @param changeSet The change set to apply
	 * @param gitRepo The git repo to apply the change set to
	 * @returns The new commit hash
	 */
	public async commitChangeSet(
		changeSet: ChangeSet,
		commitMessage: string
	): Promise<string | null> {
		try {
			await this.repo!.sitory.status();
			// check for uncommitted changes
			if (!this.repoIsClean()) {
				console.warn("Committing changeset despite unclean repo");
			}

			changesets.applyChangeSet(changeSet, this._contextProvider.meltyRoot);

			await this.repo!.sitory.add(
				Object.values(changeSet.filesChanged).map(
					({ original, updated }) => files.absolutePath(updated, this._contextProvider.meltyRoot) // either original or updated works here
				)
			);

			await this.repo!.sitory.commit(`${commitMessage}`, {
				empty: true,
			});

			await this.repo!.sitory.status();
			const newCommit = this.repo!.sitory.state.HEAD!.commit;
			return newCommit;
		} catch (error) {
			console.error('Error comitting changeset', error);
			return null;
		}
	}

	public getMeltyRemote(): { fetchUrl: string, pushUrl: string } | null {
		const remoteName = vscode.workspace.getConfiguration().get('melty.remoteName') || 'origin';
		try {
			const remote = this.repo!.sitory.state.remotes.find((r: any) => r.name === remoteName);
			return {
				fetchUrl: remote.fetchUrl,
				pushUrl: remote.pushUrl,
			};
		} catch (error) {
			console.error('Error getting origin fetch URL:', error);
			return null;
		}
	}

	public getCurrentBranch(): string | null {
		try {
			return this.repo!.sitory.state.HEAD?.name || null;
		} catch (error) {
			console.error('Error getting current branch:', error);
			return null;
		}
	}

	public async createBranch(branchName: string): Promise<boolean> {
		try {
			await this.repo!.sitory.createBranch(branchName, true);
			return true;
		} catch (error) {
			console.error(`Error creating branch ${branchName}:`, error);
			return false;
		}
	}

	public async checkoutBranch(branchName: string): Promise<boolean> {
		try {
			await this.repo!.sitory.checkout(branchName);
			return true;
		} catch (error) {
			console.error(`Error switching to branch ${branchName}:`, error);
			return false;
		}
	}

	public getLatestCommitHash(): string | undefined {
		try {
			return this.repo!.sitory.state.HEAD?.commit;
		} catch (error) {
			console.error('Error getting latest commit hash:', error);
			return undefined;
		}
	}

	/**
	 * Undoes the last commit
	 * @param commitId The ID of the commit to undo (guardrail)
	 * @returns Null if successful, otherwise error message
	 */
	public async undoLastCommit(commitId: string): Promise<string | null> {
		try {
			const isLatest = (this.getLatestCommitHash()) === commitId;
			const workingTreeChanges = this.repo!.sitory.state.workingTreeChanges;

			if (!isLatest) {
				return "Can't undo because this commit is no longer the latest.";
			}

			if (workingTreeChanges.length > 0) {
				return "Can't undo because there are uncommitted changes.";
			}

			// note that this is on some sort of internal repository object, NOT the ApiRepository
			// that we usually interact with
			// https://github.com/microsoft/vscode/blob/main/extensions/git/src/repository.ts#L831
			await this.repo!.sitory.repository.reset("HEAD~1", true);
			return null;
		} catch (error: any) {
			if (error.stderr?.includes("unknown revision or path")) {
				// TODO we could run this instead
				// git update-ref -d HEAD
				// git rm -rf .
				return `Could not undo last commit because it has no parent`;
			}
			console.error('Error undoing last commit:', error);
			return `Error undoing last commit: ${error}`;
		}
	}

	public repoIsClean(): boolean {
		try {
			return !this.repo!.sitory.state.workingTreeChanges.length &&
				!this.repo!.sitory.state.indexChanges.length &&
				!this.repo!.sitory.state.mergeChanges.length;
		} catch (error) {
			console.error('Error checking if repo is clean:', error);
			return false;
		}
	}

	public isOnMainBranch(): boolean {
		try {
			return this.repo!.sitory.state.HEAD?.name === 'main';
		} catch (error) {
			console.error('Error checking if on main branch:', error);
			return false;
		}
	}

	public async getCommit(commitSha: string): Promise<any | null> {
		try {
			return await this.repo!.sitory.getCommit(commitSha);
		} catch (error) {
			console.error(`Error getting commit ${commitSha}:`, error);
			return null;
		}
	}

	public async pushToMeltyRemote(branchName: string): Promise<boolean> {
		try {
			const remote = this.getMeltyRemote();
			await this.repo!.sitory.push(remote!.pushUrl, branchName, false); // do not force push
			return true;
		} catch (error) {
			console.error(`Error pushing branch ${branchName}:`, error);
			return false;
		}
	}

	/**
	 * Gets the diff of working changes against HEAD
	 */
	public async getUdiffFromWorking(): Promise<string> {
		try {
			return await this.repo!.sitory.diff("HEAD");
		} catch (error) {
			console.error('Error getting latest commit hash:', error);
			return '';
		}
	}

	/**
	 * Gets the diff from a commit to its parent
	 */
	public async getUdiffFromCommit(
		commit: string | undefined
	): Promise<string> {
		try {
			// Check if there are any commits in the repository
			const headCommit = await this.repo!.sitory.getCommit('HEAD').catch(() => null);

			if (!headCommit) {
				// No commits in the repository yet
				return '';
			}

			if (!commit) {
				// If commit is undefined, use the current HEAD
				commit = headCommit.hash;
			}

			// Check if the commit has exactly one parent
			const hasOneParent = await this.repo!.sitory.getCommit(commit).then(
				async (commitObj: any) => {
					return commitObj.parents?.length === 1;
				}
			);

			if (!hasOneParent) {
				return "";
			}

			const baseCommit = commit + "^"; // empty tree

			const diff = await this.repo!.sitory.diffBetween(baseCommit, commit);
			const udiffs = await Promise.all(
				diff.map(async (change: any) => {
					return await this.repo!.sitory.diffBetween(
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
}
