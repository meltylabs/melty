import {
  Conversation,
  GitRepo,
  Mode,
  ClaudeConversation,
  JouleBot,
} from "../types";
import * as joules from "../backend/joules";
import * as prompts from "../backend/prompts";
import * as claudeAPI from "../backend/claudeAPI";
import * as conversations from "../backend/conversations";
import { BaseAssistant } from "./baseAssistant";
import * as pseudoCommits from "../backend/pseudoCommits";

export class Architect extends BaseAssistant {
  async respond(
    conversation: Conversation,
    gitRepo: GitRepo,
    contextPaths: string[],
    mode: Mode,
    processPartial: (partialConversation: Conversation) => void
  ) {
    const currentPseudoCommit =
      conversations.lastJoule(conversation)!.pseudoCommit;
    const systemPrompt = prompts.architectModeSystemPrompt();

    const claudeConversation: ClaudeConversation = {
      system: systemPrompt,
      messages: [
        ...this.encodeContext(gitRepo, currentPseudoCommit, contextPaths),
        ...this.encodeMessages(conversation),
      ],
    };

    let partialJoule = joules.createJouleBot(
      "",
      "",
      mode,
      currentPseudoCommit,
      contextPaths
    );
    const finalResponse = await claudeAPI.streamClaude(
      claudeConversation,
      (responseFragment: string) => {
        const newPseudoCommit =
          pseudoCommits.createFromPrevious(currentPseudoCommit);
        partialJoule = joules.createJouleBot(
          partialJoule.message + responseFragment,
          partialJoule.message + responseFragment,
          mode,
          newPseudoCommit,
          contextPaths
        );
        const partialConversation = conversations.addJoule(
          conversation,
          partialJoule
        );
        processPartial(partialConversation);
      }
    );
    console.log(finalResponse);

    const newJoule = joules.createJouleBot(
      finalResponse,
      finalResponse,
      mode,
      currentPseudoCommit,
      contextPaths
    );
    return conversations.addJoule(conversation, newJoule);
  }
}
