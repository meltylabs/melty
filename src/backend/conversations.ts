import {
  Joule,
  Mode,
  PseudoCommit,
  Conversation,
  GitRepo,
} from "../types";
import * as joules from "./joules";
import { Coder } from "./assistants/coder";

export function create(): Conversation {
  return { joules: [] };
}

export function addJoule(conversation: Conversation, joule: Joule): Conversation {
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

export async function respondBot(
  conversation: Conversation,
  gitRepo: GitRepo,
  contextPaths: string[],
  mode: Mode,
  processPartial: (partialJoule: Joule) => void
): Promise<Conversation> {
  const coder = new Coder();
  return coder.respond(conversation, gitRepo, contextPaths, mode, processPartial);
}

export function lastJoule(conversation: Conversation): Joule | undefined {
  return conversation.joules.length
    ? conversation.joules[conversation.joules.length - 1]
    : undefined;
}
