import { Joule, Conversation } from "../types";
import * as vscode from "vscode";
import * as joules from "./joules";
export function create(): Conversation {
	return { joules: [] };
}

export function addJoule(
	conversation: Conversation,
	joule: Joule
): Conversation {
	return { joules: [...conversation.joules, joule] };
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
	return { joules: [...conversation.joules.slice(0, -1), joule] };
}
