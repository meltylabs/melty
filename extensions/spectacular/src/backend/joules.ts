import { v4 as uuidv4 } from "uuid";

import { Joule, JouleHuman, JouleBot, BotExecInfo, DiffInfo } from "../types";

export function createJouleError(errorMessage: string): JouleBot {
	return createJouleBot(errorMessage, {
		rawOutput: "[error encountered]",
		contextPaths: {
			meltyRoot: '',
			paths: []
		},
	});
}

export function createJouleHuman(message: string): JouleHuman {
	return createJouleHumanWithChanges(message, null, null);
}

export function createJouleHumanWithChanges(
	message: string,
	commit: string | null,
	diffInfo: DiffInfo | null
): JouleHuman {
	const id = uuidv4();
	return {
		id,
		message,
		author: "human",
		jouleState: "complete",
		commit,
		diffInfo,
	};
}

export function createJouleBot(
	message: string,
	botExecInfo: BotExecInfo,
	jouleState: "complete" | "partial" = "complete"
): JouleBot {
	return createJouleBotWithChanges(message, botExecInfo, null, null, jouleState);
}

export function createJouleBotWithChanges(
	message: string,
	botExecInfo: BotExecInfo,
	commit: string | null,
	diffInfo: DiffInfo | null,
	jouleState: "complete" | "partial" = "complete"
): JouleBot {
	const id = uuidv4();
	return {
		id,
		author: "bot",
		convoState: "BotChat",
		chatCodeInfo: {
			message,
			commit,
			diffInfo: diffInfo,
		},
		jouleState,
		botExecInfo: botExecInfo,
	};
}

export function updateMessage(joule: Joule, message: string): Joule {
	return { ...joule, chatCodeInfo: { ...joule.chatCodeInfo, message } };
}

export function formatMessageForClaude(joule: Joule): string {
	// note that if we show a processed message, we'll need to use `message.length ? message : "..."`
	// to ensure no Anthropic API errors
	switch (joule.author) {
		case "human":
			return joule.chatCodeInfo.message;
		case "bot":
			return (joule as JouleBot).botExecInfo.rawOutput ?? "";
	}
}
