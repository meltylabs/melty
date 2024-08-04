import { Joule, JouleBot } from './joules';
import { RepoState } from './repoStates';
import * as repoStates from './repoStates';
import * as joules from './joules';
import * as prompts from './prompts';
import * as claudeAPI from '../lib/claudeAPI';
import { SearchReplace } from './searchReplace';
import * as diffApplicatorXml from './diffApplicatorXml';

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
  // TODO 100: Add a loop here to try to correct the response if it's not good yet

  // TODO 300 (abstraction over 100 and 200): Constructing a unit of work might require multiple LLM steps: find context, make diff, make corrections.
  // We can try each step multiple times. All attempts should be represented by a tree. We pick one leaf to respond with.

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
  
  // TODO 200: get five responses, pick the best one with pickResponse

  // TODOV2 write a claudePlus
  let partialJoule = joules.createJouleBot("", currentRepoState, contextPaths);
  const finalResponse = await claudeAPI.streamClaude(claudeConversation, (responseFragment) => {
    partialJoule = joules.updateMessage(partialJoule, partialJoule.message + responseFragment) as JouleBot;
    processPartial(partialJoule);
  });

  const { message, searchReplaceBlocks } = parseMessageAndSearchReplaceBlocks(finalResponse);
  const newRepoState = diffApplicatorXml.applyDiffs(currentRepoState, searchReplaceBlocks);
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

function parseMessageAndSearchReplaceBlocks(claudeResponse: string): { message: string, searchReplaceBlocks: SearchReplace[] } {
  return {
    message: claudeResponse,
    searchReplaceBlocks: diffApplicatorXml.findSearchReplaceBlocks(claudeResponse)
  };
}