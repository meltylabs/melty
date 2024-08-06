import { RepoState } from "./repoStates";
import { Uri } from "vscode";
import { v4 as uuidv4 } from "uuid";
import * as repoStates from "./repoStates";

import { Mode, JouleHuman, JouleBot, Joule } from '../types';

export function createJouleHuman(
  message: string,
  repoState: RepoState,
): JouleHuman {
  const id = uuidv4();
  return { message, author: "human", mode: null, repoState, contextPaths: null, id };
}

export function createJouleBot(
  message: string,
  mode: Mode,
  repoState: RepoState,
  contextPaths: string[],
): JouleBot {
  const id = uuidv4();
  return { message, author: "bot", mode: mode, repoState, contextPaths, id };
}

export function updateMessage(joule: Joule, message: string): Joule {
  return { ...joule, message };
}

export async function diff(joule: Joule, repository: any): Promise<string> {
  return await repoStates.diff(joule.repoState, repository);
}
