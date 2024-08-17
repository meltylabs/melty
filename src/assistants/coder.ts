import {
  Conversation,
  GitRepo,
  ClaudeConversation,
  ClaudeMessage,
  ChangeSet,
} from "../types";
import * as joules from "../backend/joules";
import * as prompts from "../backend/prompts";
import * as claudeAPI from "../backend/claudeAPI";
import * as diffApplicatorXml from "../diffApplication/diffApplicatorXml";
import { RepoMapSpec } from "../backend/repoMapSpec";
import * as utils from "../util/utils";
import * as conversations from "../backend/conversations";
import { BaseAssistant } from "./baseAssistant";
import * as parser from "../diffApplication/parser";
import * as contextSuggester from "../backend/contextSuggester";
import * as changeSets from "../backend/changeSets";

export class Coder extends BaseAssistant {
  async respond(
    conversation: Conversation,
    gitRepo: GitRepo,
    contextPaths: string[],
    processPartial: (partialConversation: Conversation) => void
  ) {
    const repoMap = new RepoMapSpec(gitRepo);
    const workspaceFilePaths = await utils.getWorkspaceFilePaths(gitRepo);
    const repoMapString = await repoMap.getRepoMap(workspaceFilePaths);

    // const contextSuggestions = await contextSuggester.suggestContext(
    //   conversations.lastJoule(conversation)!.message,
    //   repoMap
    // );

    // // remove stuff that's already in contextUris
    // const newContextSuggestions = contextSuggestions?.filter(
    //   (suggestion) => !contextPaths.includes(suggestion)
    // );

    // console.log(
    //   "SUGGESTED CONTEXT: ",
    //   contextSuggestions?.join(","),
    //   " ... ",
    //   newContextSuggestions?.join(",")
    // );

    // TODO 100: Add a loop here to try to correct the response if it's not good yet
    // TODO 300: (abstraction over 100 and 200): Constructing a unit of work might require multiple LLM steps: find context, make diff, make corrections.
    // We can try each step multiple times. All attempts should be represented by a tree. We pick one leaf to respond with.

    const systemPrompt = this.getSystemPrompt();

    const claudeConversation: ClaudeConversation = {
      system: systemPrompt,
      messages: [
        // TODOV2 user system info
        ...(await this.encodeRepoMap(repoMapString)),
        ...this.encodeContext(gitRepo, contextPaths),
        ...this.encodeMessages(conversation),
      ],
    };

    console.log("CLAUDE CONVERSATION: ", claudeConversation);

    // TODO 200: get five responses, pick the best one with pickResponse
    // TODO 400: write a claudePlus

    let partialMessage = "";
    const finalResponse = await claudeAPI.streamClaude(
      claudeConversation,
      (responseFragment: string) => {
        partialMessage += responseFragment;
        const newConversation = this.claudeOutputToConversationNoChanges(
          conversation,
          partialMessage,
          true,
          contextPaths
        );
        processPartial(newConversation);
      }
    );
    console.log(finalResponse);

    return await this.claudeOutputToConversationApplyChanges(
      conversation,
      finalResponse,
      false,
      contextPaths,
      gitRepo
    );
  }

  private getSystemPrompt(): string {
    return [
      prompts.codeModeSystemPrompt(),
      prompts.codeChangeCommandRulesPrompt(),
      prompts.exampleConversationsPrompt(),
    ].join("\n");
  }

  private async encodeRepoMap(repoMap: string): Promise<ClaudeMessage[]> {
    return [
      {
        role: "user",
        content: `${prompts.repoMapIntro()}\n\n${repoMap}`,
      },
      { role: "assistant", content: prompts.repoMapAsstAck() },
    ];
  }

  private claudeOutputToConversationNoChanges(
    prevConversation: Conversation,
    response: string,
    partialMode: boolean,
    contextPaths: string[]
  ): Conversation {
    const { messageChunksList, searchReplaceList } = parser.splitResponse(
      response,
      partialMode
    );
    const newJoule = joules.createJouleBot(messageChunksList.join("\n"), {
      rawOutput: response,
      contextPaths: contextPaths,
      assistantType: "coder",
    });
    return conversations.addJoule(prevConversation, newJoule);
  }

  private async claudeOutputToConversationApplyChanges(
    prevConversation: Conversation,
    response: string,
    partialMode: boolean,
    contextPaths: string[],
    gitRepo: GitRepo
  ): Promise<Conversation> {
    const { messageChunksList, searchReplaceList } = parser.splitResponse(
      response,
      partialMode
    );
    const changeSet = await this.applyChanges(gitRepo, searchReplaceList);
    const newCommit = await changeSets.commitChangeSet(changeSet, gitRepo);
    const diffInfo = {
      diffPreview: await utils.getUdiffPreviewFromCommit(gitRepo, newCommit),
      filePathsChanged: Array.from(Object.keys(changeSet.filesChanged)),
    };
    const newJoule = joules.createJouleBotWithChanges(
      messageChunksList.join("\n"),
      {
        rawOutput: response,
        contextPaths: contextPaths,
        assistantType: "coder",
      },
      newCommit,
      diffInfo,
      partialMode ? "partial" : "complete"
    );
    return conversations.addJoule(prevConversation, newJoule);
  }

  /**
   * Applies changes into ChangeSet
   */
  private async applyChanges(
    gitRepo: GitRepo,
    searchReplaceList: any[]
  ): Promise<ChangeSet> {
    return await diffApplicatorXml.applyByAnyMeansNecessary(
      gitRepo,
      searchReplaceList
    );
  }
}
