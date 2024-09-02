import * as vscode from 'vscode';
import {
	Conversation,
	ContextPaths,
	ClaudeConversation,
	ChangeSet,
	BotExecInfo,
	Joule,
} from "../../types";
import * as joules from "..//joules";
import * as prompts from "..//prompts";
import * as claudeAPI from "..//claudeAPI";
import * as diffApplicatorXml from "../diffApplication/diffApplicatorXml";
import { RepoMapSpec } from "..//repoMapSpec";
import * as utils from "../../util/utils";
import * as conversations from "..//conversations";
import { BaseAssistant } from "./baseAssistant";
import * as parser from "../diffApplication/parser";
import * as changeSets from "..//changeSets";
import * as config from "../../util/config";
import { generateCommitMessage } from "../commitMessageGenerator";
import { WebviewNotifier } from "services/WebviewNotifier";
import { FileManager } from 'services/FileManager';
import { GitManager } from 'services/GitManager';
import { ErrorOperationCancelled } from 'util/utils';

const webviewNotifier = WebviewNotifier.getInstance();

export class Coder extends BaseAssistant {
	static get description() {
		return "Coder can view your codebase structure, suggest edits, and write code.";
	}

	constructor(
		private readonly _fileManager: FileManager = FileManager.getInstance(),
		private readonly _gitManager: GitManager = GitManager.getInstance()
	) {
		super();
	}

	async respond(
		conversation: Conversation,
		contextPaths: ContextPaths,
		processPartial: (partialConversation: Conversation) => void,
		cancellationToken?: vscode.CancellationToken
	) {
		webviewNotifier.updateStatusMessage("Preparing context");
		if (
			!conversation.joules ||
			conversation.joules[conversation.joules.length - 1].author !== "human"
		) {
			throw new Error("Cannot respond to non-human message");
		}
		const repoMap = new RepoMapSpec();
		const workspaceFilePaths = await this._fileManager.getWorkspaceFilesRelative(); // await utils.getWorkspaceFilePaths(gitRepo);
		const repoMapString = await repoMap.getRepoMap(workspaceFilePaths);

		// const contextSuggestions = await contextSuggester.suggestContext(
		//   conversations.lastJoule(conversation)!.message,
		//   repoMap
		// );

		// // remove stuff that's already in contextUris
		// const newContextSuggestions = contextSuggestions?.filter(
		//   (suggestion) => !contextPaths.includes(suggestion)
		// );

		// console.log(
		//   "SUGGESTED CONTEXT: ",
		//   contextSuggestions?.join(","),
		//   " ... ",
		//   newContextSuggestions?.join(",")
		// );

		// TODO 100: Add a loop here to try to correct the response if it's not good yet
		// TODO 300: (abstraction over 100 and 200): Constructing a unit of work might require multiple LLM steps: find context, make diff, make corrections.
		// We can try each step multiple times. All attempts should be represented by a tree. We pick one leaf to respond with.

		const systemPrompt = prompts.codeModeSystemPrompt();

		const claudeConversation: ClaudeConversation = {
			system: systemPrompt,
			messages: [
				// TODOV2 user system info
				...this.codebaseView(contextPaths, repoMapString),
				...this.encodeMessages(conversation),
			],
		};

		console.log("CLAUDE CONVERSATION: ", claudeConversation);

		// TODO 200: get five responses, pick the best one with pickResponse
		// TODO 400: write a claudePlus

		webviewNotifier.updateStatusMessage("Thinking");
		let partialMessage = "";
		const finalResponse = await claudeAPI.streamClaude(
			claudeConversation,
			{
				cancellationToken,
				processPartial: async (responseFragment: string) => {
					if (cancellationToken?.isCancellationRequested) {
						throw new ErrorOperationCancelled();
					}
					partialMessage += responseFragment;
					const newConversation = await this.claudeOutputToConversation(
						conversation,
						partialMessage,
						true,
						contextPaths,
						true // ignore changes
					);
					processPartial(newConversation);
				}
			}
		);
		console.log(finalResponse);

		webviewNotifier.updateStatusMessage("Applying changes");
		return await this.claudeOutputToConversation(
			conversation,
			finalResponse,
			false,
			contextPaths,
			false, // apply changes
			cancellationToken
		);
	}

	private async claudeOutputToConversation(
		prevConversation: Conversation,
		response: string,
		partialMode: boolean,
		contextPaths: ContextPaths,
		ignoreChanges: boolean,
		cancellationToken?: vscode.CancellationToken
	): Promise<Conversation> {
		const { messageChunksList, searchReplaceList } = parser.splitResponse(
			response,
			partialMode
		);
		const changeSet = ignoreChanges
			? changeSets.createEmpty()
			: await diffApplicatorXml.searchReplaceToChangeSet(
				searchReplaceList,
				contextPaths.meltyRoot
			);

		if (cancellationToken?.isCancellationRequested) {
			throw new ErrorOperationCancelled();
		}

		const nextJoule = await this.applyChangesToGetNextJoule(
			changeSet,
			messageChunksList.join("\n"),
			{
				rawOutput: response,
				contextPaths: contextPaths,
			},
			partialMode
		);

		return conversations.addJoule(prevConversation, nextJoule);
	}

	private async applyChangesToGetNextJoule(
		changeSet: ChangeSet,
		message: string,
		botExecInfo: BotExecInfo,
		partialMode: boolean
	): Promise<Joule> {
		if (changeSets.isEmpty(changeSet)) {
			return joules.createJouleBot(
				message,
				botExecInfo,
				partialMode ? "partial" : "complete"
			);
		} else {
			// note that this udiff is not generated by git and might be different
			// from the real git udiff. we can always swap it for getUdiffFromCommit
			const udiff = utils.getUdiffFromChangeSet(changeSet);

			let commit: string | null;
			if (config.getIsAutocommitMode()) {
				webviewNotifier.updateStatusMessage("Writing a commit message");
				const commitMessage = await generateCommitMessage(udiff, message);
				webviewNotifier.updateStatusMessage("Committing changes");
				commit = await this._gitManager.commitChangeSet(
					changeSet,
					commitMessage
				);
				webviewNotifier.resetStatusMessage();
			} else {
				changeSets.applyChangeSet(changeSet, this._gitManager.getMeltyRoot());
				commit = null;
			}
			const diffInfo = {
				diffPreview: udiff,
				filePathsChanged: Array.from(Object.keys(changeSet.filesChanged)),
			};
			return joules.createJouleBotWithChanges(
				message,
				botExecInfo,
				commit,
				diffInfo,
				partialMode ? "partial" : "complete"
			);
		}
	}
}
