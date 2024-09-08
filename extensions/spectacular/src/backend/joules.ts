import { v4 as uuidv4 } from "uuid";

import { Joule, JouleHuman, JouleBot, BotExecInfo, DiffInfo, ClaudeMessage, UserAttachedImage } from "../types";

export function createJouleError(errorMessage: string): JouleBot {
	return createJouleBot(errorMessage, {
		rawOutput: "[error encountered]",
		contextPaths: {
			meltyRoot: '',
			paths: []
		},
	});
}

export function createJouleHuman(message: string, images?: UserAttachedImage[]): JouleHuman {
	return createJouleHumanWithChanges(message, null, null, images);
}

export function createJouleHumanWithChanges(
	message: string,
	commit: string | null,
	diffInfo: DiffInfo | null,
	images?: UserAttachedImage[]
): JouleHuman {
	const id = uuidv4();
	return {
		id,
		message,
		author: "human",
		state: "complete",
		commit,
		diffInfo,
		images
	};
}

export function createJouleBot(
	message: string,
	botExecInfo: BotExecInfo,
	state: "complete" | "partial" = "complete"
): JouleBot {
	return createJouleBotWithChanges(message, botExecInfo, null, null, state);
}

export function createJouleBotWithChanges(
	message: string,
	botExecInfo: BotExecInfo,
	commit: string | null,
	diffInfo: DiffInfo | null,
	state: "complete" | "partial" = "complete"
): JouleBot {
	const id = uuidv4();
	return {
		id,
		message,
		author: "bot",
		state,
		commit,
		diffInfo: diffInfo,
		botExecInfo: botExecInfo,
	};
}

export function updateMessage(joule: Joule, message: string): Joule {
	return { ...joule, message };
}

export function formatMessageForClaude(joule: Joule): ClaudeMessage['content'] {
	// note that if we show a processed message, we'll need to use `message.length ? message : "..."`
	// to ensure no Anthropic API errors
	switch (joule.author) {
		case "human":
			if (joule.images && joule.images.length > 0) {
				const content: ClaudeMessage['content'] = [];
				for (const img of joule.images) {
					content.push({
						type: 'image',
						source: {
							type: 'base64',
							data: img.base64.replace(/^data:image\/\w+;base64,/, ''),
							media_type: img.mimeType
						}
					});
				}
				if (joule.message) {
					content.push({
						type: 'text',
						text: joule.message
					});
				}
				return content;
			}
			return joule.message;
		case "bot":
			return (joule as JouleBot).botExecInfo.rawOutput ?? "";
	}
}
