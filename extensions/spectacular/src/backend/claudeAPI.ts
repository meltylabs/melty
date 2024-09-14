import { Anthropic } from "@anthropic-ai/sdk";
import * as vscode from "vscode";
import { CancellationToken } from "vscode";
import * as utils from "util/utils";

import { ClaudeMessage, ClaudeConversation } from "../types";
import { ErrorOperationCancelled } from 'util/utils';

export enum Models {
	Claude35Sonnet = "claude-3-5-sonnet-20240620",
	Claude3Haiku = "claude-3-haiku-20240307",
}

export type ClaudeOpts = {
	model?: Models,
	cancellationToken?: CancellationToken,
	stopSequences?: string[],
	processPartial?: (text: string) => void,
};
export async function streamClaude(
	claudeConversation: ClaudeConversation,
	opts: ClaudeOpts = {}): Promise<string> {
	const final = await streamClaudeRaw(claudeConversation, opts);
	const textContent = final.content.find((block) => "text" in block);
	if (textContent && "text" in textContent) {
		return textContent.text.trim();
	} else {
		throw new Error("No text content found in the response");
	}
}

export async function streamClaudeRaw(
	claudeConversationUncoalesced: ClaudeConversation,
	opts: ClaudeOpts = {}): Promise<Anthropic.Messages.Message> {
	const {
		model = Models.Claude35Sonnet,
		cancellationToken,
		processPartial,
		stopSequences = []
	} = opts;

	const claudeConversation = {
		system: claudeConversationUncoalesced.system,
		messages: coalesceForClaude(claudeConversationUncoalesced.messages)
	};

	if (claudeConversation.messages.length === 0) {
		throw new Error("No messages in prompt");
	}

	const config = vscode.workspace.getConfiguration("melty");
	let apiKey = config.get<string>("anthropicApiKey");
	let baseURL = "https://melty-api.fly.dev/anthropic";

	// If the user provides an API key, go direct to Claude, otherwise proxy to Melty
	// TODO: abstract this logic away (it's repeated in commitMessageGenerator.ts)
	if (apiKey) {
		console.log("API KEY SET — DIRECT TO ANTHROPIC");
		baseURL = "https://api.anthropic.com";
	} else {
		console.log("NO API KEY — PROXYING");
		apiKey = "dummyToken";
	}

	const anthropic = new Anthropic({
		apiKey: apiKey,
		baseURL: baseURL
	});

	try {
		console.log("waiting for claude...");
		const stream = anthropic.messages
			.stream(
				{
					model: model,
					max_tokens: 4096,
					messages: claudeConversation.messages as any,
					system: claudeConversation.system,
					stop_sequences: stopSequences
				},
				{
					headers: {
						"anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
					},
				}
			)
			.on("text", (textDelta: string, _textSnapshot: string) => {
				if (cancellationToken?.isCancellationRequested) {
					stream.controller.abort();
					return;
				}
				if (processPartial) {
					processPartial(textDelta);
				}
			})
			.on('error', (error) => {
				utils.logErrorVerbose("Claude error (streaming)", error);
			});

		if (cancellationToken?.isCancellationRequested) {
			throw new ErrorOperationCancelled();
		}
		const final = await stream.finalMessage();
		return final;
	} catch (error) {
		utils.logErrorVerbose("Claude error (final)", error);
		throw error;
	}
}


/**
 * Guarantees properties required for Claude:
 * - alternating roles in the resulting array
 * - human message first
 * @param messages possibly malformed array of messages
 * @returns well-formed array of messages
 */
function coalesceForClaude(messages: ClaudeMessage[]): ClaudeMessage[] {
	// reduce over messagesOrNulls to remove nulls and combine adjacent messages with same role
	return messages.reduce((acc: ClaudeMessage[], message) => {
		if (message === null) {
			return acc;
		} else {
			const lastMessage = acc[acc.length - 1];
			if (!lastMessage && message.role === "assistant") {
				vscode.window.showWarningMessage("Removing leading assistant message to recover from an issue");
				console.warn(`Dropping leading assistant message ${message.content}`);
				return acc;
			} else if (lastMessage && lastMessage.role === message.role) {
				// coalesce adjacent messages with same role
				return [
					...acc.slice(0, -1),
					{
						...lastMessage,
						content: `${lastMessage.content}\n\n${message.content}`,
					},
				];
			} else {
				return [...acc, message];
			}
		}
	}, []);
}
