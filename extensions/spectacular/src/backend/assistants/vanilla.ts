import { Conversation, ContextPaths, ClaudeConversation, Joule } from "../../types";
import * as joules from "../joules";
import * as prompts from "../prompts";
import * as claudeAPI from "../claudeAPI";
import { BaseAssistant } from "./baseAssistant";
import * as vscode from "vscode";

export class Vanilla extends BaseAssistant {
	static get description() {
		return "Vanilla sends your message to Claude without messing with the prompt. It can't see your codebase.";
	}

	responders = new Map();

	constructor() {
		super();
		this.responders.set("BotChat", this.chat);
	}


	private async chat(
		conversation: Conversation,
		contextPaths: ContextPaths,
		sendPartialJoule: (partialJoule: Joule) => void,
		cancellationToken?: vscode.CancellationToken
	): Promise<Joule> {
		const systemPrompt = prompts.vanillaModeSystemPrompt();

		const claudeConversation: ClaudeConversation = {
			system: systemPrompt,
			messages: [
				...this.codebaseView(contextPaths, ""),
				...this.encodeMessages(conversation),
			],
		};

		let partialMessage = "";
		const finalResponse = await claudeAPI.streamClaude(
			claudeConversation, {
			processPartial: async (responseFragment: string) => {
				partialMessage += responseFragment;
				const newJoule = joules.createJouleBotChat(
					partialMessage,
					{ rawOutput: partialMessage, contextPaths: contextPaths },
					"partial",
					null // no stop reason
				);
				sendPartialJoule(newJoule);
			}
		});
		console.log(finalResponse);

		return joules.createJouleBotChat(
			finalResponse,
			{
				rawOutput: finalResponse,
				contextPaths: contextPaths,
			},
			"complete",
			"endTurn"
		);
	}
}
