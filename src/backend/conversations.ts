import { Joule, Conversation } from "../types";
import * as vscode from "vscode";

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

export function forceRemoveHumanJoules(
  conversation: Conversation
): Conversation {
  vscode.window.showInformationMessage(
    "Melty is force-removing failed messages to recover from an issue"
  );
  // remove any human joules at the end of the conversation
  const indexOfLastBotJoule =
    conversation.joules.length -
    1 -
    Array.from(conversation.joules)
      .reverse()
      .findIndex((joule) => joule.author === "bot");
  return {
    joules: conversation.joules.slice(0, indexOfLastBotJoule + 1),
  };
}
