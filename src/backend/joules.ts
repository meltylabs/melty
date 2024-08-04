import { RepoState } from "./repoStates";
import { Uri } from "vscode";
import { v4 as uuidv4 } from "uuid";

export type JouleHuman = {
  readonly author: "human";
  readonly id: string;
  readonly message: string;
  readonly repoState: RepoState;
  readonly contextPaths: null;
};

export type JouleBot = {
  readonly author: "bot";
  readonly id: string;
  readonly message: string;
  readonly repoState: RepoState;
  readonly contextPaths: ReadonlyArray<string>;
};

export type Joule = JouleHuman | JouleBot;

export function createJouleHuman(
  message: string,
  repoState: RepoState,
): JouleHuman {
  const id = uuidv4();
  return { message, author: "human", repoState, contextPaths: null, id };
}

export function createJouleBot(
  message: string,
  repoState: RepoState,
  contextPaths: string[],
): JouleBot {
  const id = uuidv4();
  return { message, author: "bot", repoState, contextPaths, id };
}

export function updateMessage(joule: Joule, message: string): Joule {
  return { ...joule, message };
}