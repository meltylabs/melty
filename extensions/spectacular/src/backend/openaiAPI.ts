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
	let baseURL = "http://localhost:4000/openai";

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
		// const messages = model !== Models.O1
		// 	? [
		// 		{ role: "system", content: openAIConversation.system },
		// 		...openAIConversation.messages
		// 	]
		// 	: openAIConversation.messages;

		const stream = await openai.chat.completions.create({
			model: model,
			messages: openAIConversation.messages,
			stream: true,
		});

		let fullResponse = "";

		for await (const chunk of stream) {
			if (cancellationToken?.isCancellationRequested) {
				stream.controller.abort();
				throw new ErrorOperationCancelled();
			}

			const content = chunk.choices[0]?.delta?.content || "";
			if (processPartial) {
				processPartial(content);
			}
			fullResponse += content;
		}

		return fullResponse.trim();
	} catch (error) {
		utils.logErrorVerbose("OpenAI error", error);
		throw error;
	}
}
