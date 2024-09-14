import * as vscode from 'vscode';
import {
	Conversation,
	ContextPaths,
	ClaudeConversation,
	ChangeSet,
	BotExecInfo,
	Joule,
	JouleBotChat,
	JouleBotCode,
	nextJouleType,
	JouleType
} from "../../types";
import * as joules from "..//joules";
import * as prompts from "..//prompts";
import * as claudeAPI from "..//claudeAPI";
import * as openaiAPI from "..//openaiAPI"
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

const PREFILL_TEXT = "<change_code";

export class Coder extends BaseAssistant {
	static get description() {
		return "Coder can view your codebase structure, suggest edits, and write code.";
	}

	responders = new Map();

	constructor(
		private readonly _fileManager: FileManager = FileManager.getInstance(),
		private readonly _gitManager: GitManager = GitManager.getInstance(),
		private readonly _webviewNotifier: WebviewNotifier = WebviewNotifier.getInstance()
	) {
		super();
		this.responders.set("BotChat", this.chat.bind(this));
		this.responders.set("BotCode", this.code.bind(this));
	}

	private async chat(
		conversation: Conversation,
		contextPaths: ContextPaths,
		sendPartialJoule: (partialJoule: Joule) => void,
		cancellationToken?: vscode.CancellationToken
	): Promise<JouleBotChat> {
		const claudeConversation = await this.prepareContext(contextPaths, conversation);

		this._webviewNotifier.updateStatusMessage("Thinking");
		let partialMessage = "";
		const finalResponse = await claudeAPI.streamClaudeRaw(
			claudeConversation,
			{
				cancellationToken,
				stopSequences: ["<change_code"],
				processPartial: async (responseFragment: string) => {
					if (cancellationToken?.isCancellationRequested) {
						throw new ErrorOperationCancelled();
					}
					partialMessage += responseFragment;
					const newJoule = joules.createJouleBotChat(
						partialMessage,
						{ rawInput: claudeConversation, rawOutput: partialMessage, contextPaths: contextPaths },
						"partial",
						null // no stop reason
					);
					sendPartialJoule(newJoule);
				}
			}
		);

		const text = finalResponse.content.find((block) => "text" in block)?.text?.trim() || ""; // todo better error handling
		console.log(finalResponse);

		const stopReason = finalResponse.stop_reason === "stop_sequence" && finalResponse.stop_sequence === "<change_code" ? "confirmCode" : "endTurn";

		return joules.createJouleBotChat(
			text,
			{ rawInput: claudeConversation, rawOutput: text, contextPaths: contextPaths },
			"complete",
			stopReason
		);
	}

	private async code(
		conversation: Conversation,
		contextPaths: ContextPaths,
		sendPartialJoule: (partialJoule: Joule) => void,
		cancellationToken?: vscode.CancellationToken
	): Promise<JouleBotCode> {
		this.prepForChanges();

		const claudeConversation = await this.prepareContext(contextPaths, conversation);
		claudeConversation.messages.push({
			role: "assistant",
			content: PREFILL_TEXT
		});

		this._webviewNotifier.updateStatusMessage("Thinking");
		let partialMessage = PREFILL_TEXT;
		const finalResponse = await claudeAPI.streamClaudeRaw(
			claudeConversation,
			{
				cancellationToken,
				processPartial: async (responseFragment: string) => {
					if (cancellationToken?.isCancellationRequested) {
						throw new ErrorOperationCancelled();
					}
					partialMessage += responseFragment;
					const newJoule =
						await this.codeMessageToJoule(
							partialMessage, true, {
							rawInput: claudeConversation,
							rawOutput: partialMessage,
							contextPaths
						}
						);
					sendPartialJoule(newJoule);
				}
			}
		);

		const text = PREFILL_TEXT + finalResponse.content.find((block) => "text" in block)?.text?.trim() || ""; // todo better error handling
		console.log(finalResponse);

		// do the committing
		const newJoule = await this.codeMessageToJoule(
			text, false, {
			rawInput: claudeConversation,
			rawOutput: text,
			contextPaths
		}
		);

		this.cleanUpAfterChanges(newJoule);
		return newJoule;
	}

	private async prepForChanges(): Promise<void> {
		this._webviewNotifier.updateStatusMessage("Checking repo status");
		// eventually, we'll want to ensure working directory clean and on correct branch
		this._webviewNotifier.resetStatusMessage();
	}


	private async cleanUpAfterChanges(jouleBotCode: JouleBotCode) {
		this._webviewNotifier.updateStatusMessage(
			"Adding edited files to Melty's Mind"
		);
		if (jouleBotCode.codeInfo.diffInfo?.filePathsChanged) {
			// add any edited files to melty's mind
			jouleBotCode.codeInfo.diffInfo.filePathsChanged.forEach((editedFile) => {
				this._fileManager.addMeltyMindFile(editedFile, true);
			});
		}
	}

	private async prepareContext(contextPaths: ContextPaths, conversation: Conversation): Promise<ClaudeConversation> {
		this._webviewNotifier.updateStatusMessage("Preparing context");
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

		const systemPrompt = prompts.codeModeSystemPrompt();

		const messages = [
			...this.encodeMessages(conversation),
			...this.codebaseView(contextPaths, repoMapString),
		];

		const claudeConversation: ClaudeConversation = {
			system: systemPrompt,
			messages: messages,
		};

		console.log("CLAUDE CONVERSATION: ", claudeConversation);

		return claudeConversation;
	}

	/**
	 * Takes a message from Claude containing code, parses the code, commits it,
	 * returns a Joule with the resulting code.
	 */
	private async codeMessageToJoule(
		response: string,
		partialMode: boolean,
		botExecInfo: BotExecInfo,
		cancellationToken?: vscode.CancellationToken
	): Promise<JouleBotCode> {
		const { messageChunksList, searchReplaceList } = parser.splitResponse(
			response,
			partialMode
		);
		const changeSet = partialMode
			? changeSets.createEmpty()
			: await diffApplicatorXml.searchReplaceToChangeSet(
				searchReplaceList,
				botExecInfo.contextPaths.meltyRoot
			);

		if (cancellationToken?.isCancellationRequested) {
			throw new ErrorOperationCancelled();
		}

		return await this.applyChangesToGetNextJoule(
			changeSet,
			messageChunksList.join("\n"),
			botExecInfo,
			partialMode
		);
	}

	private async applyChangesToGetNextJoule(
		changeSet: ChangeSet,
		message: string,
		botExecInfo: BotExecInfo,
		partialMode: boolean
	): Promise<JouleBotCode> {
		if (changeSets.isEmpty(changeSet)) {
			return joules.createJouleBotCode(
				message,
				{
					commit: null,
					diffInfo: null,
				},
				botExecInfo,
				partialMode ? "partial" : "complete"
			);
		} else {
			// note that this udiff is not generated by git and might be different
			// from the real git udiff. we can always swap it for getUdiffFromCommit
			const udiff = utils.getUdiffFromChangeSet(changeSet);

			let commit: string | null;
			if (config.getIsAutocommitMode()) {
				this._webviewNotifier.updateStatusMessage("Writing a commit message");
				const commitMessage = await generateCommitMessage(udiff, message);
				this._webviewNotifier.updateStatusMessage("Committing changes");
				commit = await this._gitManager.commitChangeSet(
					changeSet,
					commitMessage
				);
				this._webviewNotifier.resetStatusMessage();
			} else {
				changeSets.applyChangeSet(changeSet, this._gitManager.getMeltyRoot());
				commit = null;
			}
			const diffInfo = {
				diffPreview: udiff,
				filePathsChanged: Array.from(Object.keys(changeSet.filesChanged)),
			};
			return joules.createJouleBotCode(
				message,
				{ commit, diffInfo },
				botExecInfo,
				partialMode ? "partial" : "complete"
			);
		}
	}
}
