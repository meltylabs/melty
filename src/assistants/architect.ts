import { Conversation, GitRepo, ClaudeConversation } from "../types";
import * as joules from "../backend/joules";
import * as prompts from "../backend/prompts";
import * as claudeAPI from "../backend/claudeAPI";
import * as conversations from "../backend/conversations";
import { BaseAssistant } from "./baseAssistant";

export class Architect extends BaseAssistant {
  async respond(
    conversation: Conversation,
    gitRepo: GitRepo,
    contextPaths: string[],
    processPartial: (partialConversation: Conversation) => void
  ) {
    const systemPrompt = prompts.architectModeSystemPrompt();

    const claudeConversation: ClaudeConversation = {
      system: systemPrompt,
      messages: [
        ...this.encodeContext(gitRepo, contextPaths),
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
    const newJoule = joules.createJouleBot(response, {
      rawOutput: response,
      contextPaths: contextPaths,
      assistantType: "architect",
    });
    return conversations.addJoule(conversation, newJoule);
  }
}
