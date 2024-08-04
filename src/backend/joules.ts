import { RepoState } from "./repoStates";
import { Uri } from "vscode";

export type JouleHuman = {
  readonly author: "human";
  readonly message: string;
  readonly repoState: RepoState;
  readonly contextUris: null;
};


export type JouleBot = {
  readonly author: "bot";
  readonly message: string;
  readonly repoState: RepoState;
  readonly contextUris: ReadonlyArray<Uri>;
};

export type Joule = JouleHuman | JouleBot;

export function createJouleHuman(
  message: string,
  repoState: RepoState,
): JouleHuman {
  return { message, author: "human", repoState, contextUris: null };
}

export function createJouleBot(
  message: string,
  repoState: RepoState,
  contextUris: Uri[]
): JouleBot {
  return { message, author: "bot", repoState, contextUris };
}