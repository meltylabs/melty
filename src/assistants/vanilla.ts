import { Conversation, GitRepo, ClaudeConversation } from "../types";
import * as joules from "../backend/joules";
import * as prompts from "../backend/prompts";
import * as claudeAPI from "../backend/claudeAPI";
import * as conversations from "../backend/conversations";
import { BaseAssistant } from "./baseAssistant";

export class Vanilla extends BaseAssistant {
  static get description() {
    return "Vanilla sends your message to Claude without messing with the prompt. It can't see your codebase.";
  }

  async respond(
    conversation: Conversation,
    gitRepo: GitRepo,
    contextPaths: string[],
    processPartial: (partialConversation: Conversation) => void
  ) {
    const systemPrompt = prompts.vanillaModeSystemPrompt();

    const claudeConversation: ClaudeConversation = {
      system: systemPrompt,
      messages: [
        ...this.codebaseView(gitRepo, contextPaths, ""),
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
      contextPaths
    );
  }

  private claudeOutputToConversation(
    conversation: Conversation,
    response: string,
    partialMode: boolean,
    contextPaths: string[]
  ): Conversation {
    const newJoule = joules.createJouleBot(
      response,
      {
        rawOutput: response,
        contextPaths: contextPaths,
      },
      partialMode ? "partial" : "complete"
    );
    return conversations.addJoule(conversation, newJoule);
  }
}
