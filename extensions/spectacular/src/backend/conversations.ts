import { Joule, Conversation, ClaudeMessage } from "../types";
import * as prompts from "./prompts";

export function create(codebaseView: ClaudeMessage[]): Conversation {
	return {
		conversationBase: {
			systemPrompt: prompts.codeModeSystemPrompt(),
			codebaseView
		}, joules: []
	};
}

export function addJoule(
	conversation: Conversation,
	joule: Joule
): Conversation {
	return { ...conversation, joules: [...conversation.joules, joule] };
}

export function lastJoule(conversation: Conversation): Joule | undefined {
	return conversation.joules.length
		? conversation.joules[conversation.joules.length - 1]
		: undefined;
}

export function replaceLastJoule(
	conversation: Conversation,
	joule: Joule
): Conversation {
	if (conversation.joules.length === 0) {
		throw new Error("No joules to replace");
	}
	return { ...conversation, joules: [...conversation.joules.slice(0, -1), joule] };
}
