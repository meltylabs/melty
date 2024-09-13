import OpenAI from "openai";
import * as vscode from "vscode";
import { CancellationToken } from "vscode";
import * as utils from "util/utils";

import { OpenAIMessage, OpenAIConversation } from "../types";
import { ErrorOperationCancelled } from 'util/utils';

export enum Models {
	GPT4o = "gpt-4o",
	GPT4oMini = "gpt-4o",
	O1 = "o1-preview",
	O1Mini = "o1-mini"
}

export async function streamOpenAI(
	openAIConversation: OpenAIConversation,
	opts: {
		model?: Models,
		cancellationToken?: CancellationToken,
		processPartial?: (text: string) => void,
	} = {}): Promise<string> {
	const { model = Models.O1, cancellationToken, processPartial } = opts;

	if (openAIConversation.messages.length === 0) {
		throw new Error("No messages in prompt");
	}

	const config = vscode.workspace.getConfiguration("melty");
	let apiKey = config.get<string>("openaiApiKey");
	let baseURL = "https://melty-api.fly.dev/openai";

	// If the user provides an API key, go direct to OpenAI, otherwise proxy to Melty
	if (apiKey) {
		console.log("API KEY SET — DIRECT TO OPENAI");
		baseURL = "https://api.openai.com/v1";
	} else {
		console.log("NO API KEY — PROXYING");
		apiKey = "dummyToken";
	}

	const openai = new OpenAI({
		apiKey: apiKey,
		baseURL: baseURL
	});

	try {
		console.log("waiting for OpenAI...");

		/**
		 * Right now, O1 doesn't support streaming or system prompts.
		 */
		const response = await openai.chat.completions.create({
			model: model,
			messages: openAIConversation.messages,
			stream: false,
		});

		let fullResponse = response.choices[0].message.content;

		if (fullResponse !== null) {
			return fullResponse
		} else {
			return "OpenAI failed :("
		}
	} catch (error) {
		utils.logErrorVerbose("OpenAI error", error);
		throw error;
	}
}
