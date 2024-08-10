import { PseudoCommit } from "../types";
import { Uri } from "vscode";
import { v4 as uuidv4 } from "uuid";
import * as pseudoCommits from "./pseudoCommits";

import { Mode, JouleHuman, JouleBot, Joule } from '../types';

export function createJouleHuman(
  message: string,
  pseudoCommit: PseudoCommit,
): JouleHuman {
  const id = uuidv4();
  return { message, author: "human", mode: null, pseudoCommit, contextPaths: null, id };
}

export function createJouleBot(
  message: string,
  rawOutput: string,
  mode: Mode,
  pseudoCommit: PseudoCommit,
  contextPaths: string[],
): JouleBot {
  const id = uuidv4();
  return { message, rawOutput: string, author: "bot", mode: mode, pseudoCommit, contextPaths, id };
}

export function updateMessage(joule: Joule, message: string): Joule {
  return { ...joule, message };
}

export async function diff(joule: Joule, repository: any): Promise<string> {
  return await pseudoCommits.diff(joule.pseudoCommit, repository);
}

export function formatMessageForClaude(joule: Joule): string {
  // note that if we show a processed message, we'll need to use `message.length ? message : "..."`
  // to ensure no Anthropic API errors
  switch (joule.author) {
    case "human":
      return joule.message;
    case "bot":
      return joule.rawOutput;
  }
}