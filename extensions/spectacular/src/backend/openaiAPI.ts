import OpenAI from "openai";
import * as vscode from "vscode";
import { CancellationToken } from "vscode";
import * as utils from "util/utils";

import { ErrorOperationCancelled } from 'util/utils';

type OpenAIMessage = OpenAI.Chat.ChatCompletionMessage;

export type OpenAIConversation = {
    system: string;
    messages: OpenAIMessage[];
};

export enum Models {
	GPT4 = "gpt-4",
	GPT35Turbo = "gpt-3.5-turbo",
}

export async function streamOpenAI(
	openAIConversation: OpenAIConversation,
	opts: {
		model?: Models,
		cancellationToken?: CancellationToken,
		processPartial?: (text: string) => void,
	} = {}): Promise<string> {
	const { model = Models.GPT4, cancellationToken, processPartial } = opts;

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
		const stream = await openai.chat.completions.create({
			model: model,
			messages: [
				{ role: "system", content: openAIConversation.system },
				...openAIConversation.messages
			],
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
