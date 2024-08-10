import { Joule, Mode, PseudoCommit, Conversation, GitRepo } from "../types";
import * as joules from "./joules";
import * as pseudoCommits from "./pseudoCommits";

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
  pseudoCommit: PseudoCommit
): Conversation {
  const newJoule = joules.createJouleHuman(message, pseudoCommit);
  return addJoule(conversation, newJoule);
}

export function lastJoule(conversation: Conversation): Joule | undefined {
  return conversation.joules.length
    ? conversation.joules[conversation.joules.length - 1]
    : undefined;
}

/**
 * Returns a pseudo commit that is a copy of the last joule's pseudo commit.
 */
export function commitUnchanged(conversation: Conversation): PseudoCommit {
  return pseudoCommits.createFromPrevious(
    lastJoule(conversation)!.pseudoCommit
  );
}
