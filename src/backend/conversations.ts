import { Joule, Conversation } from "../types";
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

export function respondHuman(
  conversation: Conversation,
  message: string,
  commit: string | null
): Conversation {
  const newJoule = joules.createJouleHuman(message, commit);
  return addJoule(conversation, newJoule);
}

export function lastJoule(conversation: Conversation): Joule | undefined {
  return conversation.joules.length
    ? conversation.joules[conversation.joules.length - 1]
    : undefined;
}
