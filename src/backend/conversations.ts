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

export function replaceLastJoule(
  conversation: Conversation,
  joule: Joule
): Conversation {
  if (conversation.joules.length === 0) {
    throw new Error("No joules to replace");
  }
  return { joules: [...conversation.joules.slice(0, -1), joule] };
}

/**
 * removes any joules needed to make the conversation ready for a response from the given author
 */
export function forceConversationReadyForResponseFrom(
  conversation: Conversation,
  author: "human" | "bot"
): Conversation {
  const oppositeAuthor = author === "human" ? "bot" : "human";

  const indexOfLastNonMatchingJoule = conversation.joules.some(
    (joule) => joule.author === oppositeAuthor
  )
    ? conversation.joules.length -
      1 -
      Array.from(conversation.joules)
        .reverse()
        .findIndex((joule) => joule.author === oppositeAuthor)
    : -1; // no matching joules

  if (indexOfLastNonMatchingJoule === conversation.joules.length - 1) {
    // no changes needed!
    return conversation;
  } else {
    vscode.window.showInformationMessage(
      `Melty is force-removing ${oppositeAuthor} joules to prepare for a response from ${author}`
    );
    return {
      joules: conversation.joules.slice(0, indexOfLastNonMatchingJoule + 1),
    };
  }
}
