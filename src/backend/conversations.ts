import { Joule, JouleBot } from './joules';
import { RepoState } from './repoStates';
import * as repoStates from './repoStates';
import * as joules from './joules';
import * as prompts from './prompts';
import * as claudeAPI from '../lib/claudeAPI';
import { Uri } from 'vscode';
import { applyDiffs } from './diffApplicator';
import { Readable } from 'stream';

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

export async function respondBot(conversation: Conversation, contextPaths: string[], processPartial: (partialJoule: Joule) => void): Promise<Conversation> {
  const currentRepoState = lastJoule(conversation).repoState;

  const claudeConversation: claudeAPI.ClaudeConversation = {
    system: (
      prompts.systemPrompt()
      + prompts.diffDecoderPrompt()
      + prompts.exampleConversationsPrompt()
    ),
    messages: [
      // TODOV2 user system info
      // TODOV2 repo map
      ...encodeContext(currentRepoState, contextPaths),
      ...encodeMessages(conversation)
    ]
  };
  
  // TODOV2 write a claudePlus
  let partialJoule = joules.createJouleBot("", currentRepoState, contextPaths);
  const finalResponse = await claudeAPI.streamClaude(claudeConversation, (responseFragment) => {
    partialJoule = joules.updateMessage(partialJoule, partialJoule.message + responseFragment) as JouleBot;
    processPartial(partialJoule);
  });

  const message = decodeMessage(finalResponse);
  const newRepoState = applyDiffs(currentRepoState, message);
  const newJoule = joules.createJouleBot(message, newRepoState, contextPaths);
  const newConversation = addJoule(conversation, newJoule);
  return newConversation;
}

function encodeFile(repoState: RepoState, path: string) {
    return `${path}
\`\`\`
${repoStates.getFileContents(repoState, path)}
\`\`\``;
}

function encodeContext(repoState: RepoState, contextPaths: string[]): claudeAPI.ClaudeMessage[] {
  // in the future, this could handle other types of context, like web urls
  const fileEncodings = contextPaths.map((path) => encodeFile(repoState, path)).join("\n");

  return fileEncodings.length ? [
    { role: "user", content: `${prompts.filesUserIntro()}

${fileEncodings}` },
   { role: "assistant", content: prompts.filesAsstAck()}
  ] : [];
}

export function lastJoule(conversation: Conversation): Joule {
  return conversation.joules[conversation.joules.length - 1];
}

function encodeMessages(conversation: Conversation): claudeAPI.ClaudeMessage[] {
  return conversation.joules.map((joule) => {
    return {
      role: joule.author === "human" ? "user" : "assistant",
      content: joule.message
    };
  });
}

function decodeMessage(response: string): string {
  return response;
}
