import { v4 as uuidv4 } from "uuid";

import { Joule, JouleHuman, JouleBot, BotExecInfo, DiffInfo } from "../types";

export function createJouleError(errorMessage: string): JouleBot {
  return createJouleBot(errorMessage, {
    rawOutput: "[error encountered]",
    contextPaths: [],
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
    state: "complete",
    commit,
    diffInfo,
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

export function formatMessageForClaude(joule: Joule): string {
  // note that if we show a processed message, we'll need to use `message.length ? message : "..."`
  // to ensure no Anthropic API errors
  switch (joule.author) {
    case "human":
      return joule.message;
    case "bot":
      return (joule as JouleBot).botExecInfo.rawOutput ?? "";
  }
}
