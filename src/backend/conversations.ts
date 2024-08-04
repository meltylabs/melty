import { Joule } from './joules';
import { RepoState } from './repoStates';
import * as repoStates from './repoStates';
import * as joules from './joules';
import * as prompts from './prompts';
import * as claudeAPI from '../lib/claudeAPI';
import { Uri } from 'vscode';
import { applyDiffs } from './diffApplicator';

export type Conversation = {
  readonly joules: ReadonlyArray<Joule>;
};

export function create(): Conversation {
    return { joules: [] };
}

function addJoule(conversation: Conversation, joule: Joule): Conversation {
  return { joules: [...conversation.joules, joule] };
}

export function respondHuman(conversation: Conversation, message: string, repoState: RepoState): Conversation {
  const newJoule = joules.createJouleHuman(message, repoState);
  return addJoule(conversation, newJoule);
}

export async function respondBot(conversation: Conversation, contextUris: Uri[]): Promise<Conversation> {
  const currentRepoState = lastJoule(conversation).repoState;

  const claudeConversation: claudeAPI.ClaudeMessage[] = [
    {"role": "system", "content": (
      prompts.systemPrompt()
      + prompts.diffDecoderPrompt()
      + prompts.exampleConversationsPrompt()
    )},
    // TODOV2 user system info
    // TODOV2 repo map
    ...encodeMessages(conversation),
    ...encodeContext(currentRepoState, contextUris)
  ];
  
  // TODOV2 write a claudePlus
  const response = await claudeAPI.claude(claudeConversation);

  const message = decodeMessage(response);
  const nextRepoState = applyDiffs(currentRepoState, response);

  const newJoule = joules.createJouleBot(message, nextRepoState, contextUris);
  return addJoule(conversation, newJoule);
}

function encodeFile(repoState: RepoState, path: string) {
    return `${path}
\`\`\`
${repoStates.getFileContents(repoState, path)}
\`\`\``;
}

function encodeContext(repoState: RepoState, contextUris: Uri[]): claudeAPI.ClaudeMessage[] {
  // in the future, this could handle other types of context, like web urls
  const fileEncodings = contextUris.map((uri) => encodeFile(repoState, uri.toString())).join("\n");

  return [
    { role: "user", content: `${prompts.filesUserIntro()}

${fileEncodings}` },
   { role: "assistant", content: prompts.filesAsstAck()}
  ];
}

function lastJoule(conversation: Conversation): Joule {
  return conversation.joules[conversation.joules.length - 1];
}

function encodeMessages(conversation: Conversation): claudeAPI.ClaudeMessage[] {
  // return conversation.joules.map((joule) => {
  //   return {
  //     role: joule.author === "human" ? "user" : "assistant",
  //     content: joule.message
  //   };
  // });
  return [{ role: "user", content: "Hello, world!" }];
}

function decodeMessage(response: string): string {
  // TODO: Implement message decoding
  return '';
}
