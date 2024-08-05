import { Joule, JouleBot, Mode } from './joules';
import { RepoState } from './repoStates';
import * as repoStates from './repoStates';
import * as joules from './joules';
import * as prompts from './prompts';
import * as claudeAPI from '../lib/claudeAPI';
import { SearchReplace } from './searchReplace';
import * as diffApplicatorXml from './diffApplicatorXml';
// import { RepoMap } from './repoMap';

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

export async function respondBot(
  conversation: Conversation,
  contextPaths: string[],
  mode: Mode,
  processPartial: (partialJoule: Joule) => void
): Promise<Conversation> {
  const currentRepoState = lastJoule(conversation).repoState;
  // TODO 100: Add a loop here to try to correct the response if it's not good yet

  // TODO 300 (abstraction over 100 and 200): Constructing a unit of work might require multiple LLM steps: find context, make diff, make corrections.
  // We can try each step multiple times. All attempts should be represented by a tree. We pick one leaf to respond with.

  const systemPrompt = (() => {
    switch (mode) {
      case "code":
        return (
          prompts.codeModeSystemPrompt()
            + prompts.diffDecoderPrompt()
            + prompts.exampleConversationsPrompt()
            + prompts.codeChangeCommandRulesPrompt()
        );
      case "ask":
        return prompts.askModeSystemPrompt();
    }
  })();

  const claudeConversation: claudeAPI.ClaudeConversation = {
    system: systemPrompt,
    messages: [
      // TODOV2 user system info
      // ...encodeRepoMap(currentRepoState),
      ...encodeContext(currentRepoState, contextPaths),
      ...encodeMessages(conversation)
    ]
  };
  
  // TODO 200: get five responses, pick the best one with pickResponse

  // TODOV2 write a claudePlus
  console.log(systemPrompt);
  let partialJoule = joules.createJouleBot("", mode, currentRepoState, contextPaths);
  const finalResponse = await claudeAPI.streamClaude(claudeConversation, (responseFragment) => {
    partialJoule = joules.updateMessage(partialJoule, partialJoule.message + responseFragment) as JouleBot;
    processPartial(partialJoule);
  });

  const { messageChunksList, searchReplaceList } = diffApplicatorXml.splitResponse(finalResponse);

  const newRepoState = (
    mode === "code"
      ? diffApplicatorXml.applySearchReplaceBlocks(currentRepoState, searchReplaceList)
      : currentRepoState
);
  const newJoule = joules.createJouleBot(messageChunksList.join("\n"), mode, newRepoState, contextPaths);
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

function encodeRepoMap(repoState: RepoState): claudeAPI.ClaudeMessage[] {
  // return [
  //   { role: "user", content: `Here's a map of the repository I'm working in:
      
  //     ${new RepoMap({ root: "ROOT_DIR_TODO" }).getRepoMap(
  //       ["abc.py", "def.py"],
  //       ["ghi.py"]
  //     )}` },
  //   { role: "assistant", content: "Thanks. I'll pay close attention to this."}
  // ];
  return [];
}

export function lastJoule(conversation: Conversation): Joule {
  return conversation.joules[conversation.joules.length - 1];
}

function encodeMessages(conversation: Conversation): claudeAPI.ClaudeMessage[] {
  return conversation.joules.map((joule) => {
    return {
      role: joule.author === "human" ? "user" : "assistant",
      content: joule.message.length ? joule.message : "..." // appease Claude, who demands all messages be non-empty
    };
  });
}
