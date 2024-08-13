import {
  Conversation,
  GitRepo,
  ClaudeConversation,
  PseudoCommit,
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

    let partialResponse = "";
    const finalResponse = await claudeAPI.streamClaude(
      claudeConversation,
      (responseFragment: string) => {
        partialResponse += responseFragment;
        const partialConversation = this.claudeOutputToConversation(
          conversation,
          partialResponse,
          true,
          currentPseudoCommit,
          contextPaths
        );
        processPartial(partialConversation);
      }
    );
    console.log(finalResponse);

    return this.claudeOutputToConversation(
      conversation,
      finalResponse,
      false,
      currentPseudoCommit,
      contextPaths
    );
  }

  private claudeOutputToConversation(
    conversation: Conversation,
    response: string,
    partialMode: boolean,
    currentPseudoCommit: PseudoCommit,
    contextPaths: string[]
  ): Conversation {
    const newPseudoCommit =
      pseudoCommits.createFromPrevious(currentPseudoCommit);
    const newJoule = joules.createJouleBot(
      response,
      response,
      newPseudoCommit,
      contextPaths,
      "architect"
    );
    return conversations.addJoule(conversation, newJoule);
  }
}
