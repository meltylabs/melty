import { RepoState } from "./repoStates";
import { Uri } from "vscode";

export type JouleHuman = {
  readonly author: "human";
  readonly message: string;
  readonly repoState: RepoState;
  readonly contextPaths: null;
};


export type JouleBot = {
  readonly author: "bot";
  readonly message: string;
  readonly repoState: RepoState;
  readonly contextPaths: ReadonlyArray<string>;
};

export type Joule = JouleHuman | JouleBot;

export function createJouleHuman(
  message: string,
  repoState: RepoState,
): JouleHuman {
  return { message, author: "human", repoState, contextPaths: null };
}

export function createJouleBot(
  message: string,
  repoState: RepoState,
  contextPaths: string[]
): JouleBot {
  return { message, author: "bot", repoState, contextPaths };
}