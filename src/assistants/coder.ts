import {
  Conversation,
  GitRepo,
  ClaudeConversation,
  ClaudeMessage,
  ChangeSet,
  BotExecInfo,
  Joule,
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
import * as changeSets from "../backend/changeSets";
import { generateCommitMessage } from "../backend/commitMessageGenerator";

export class Coder extends BaseAssistant {
  async respond(
    conversation: Conversation,
    gitRepo: GitRepo,
    contextPaths: string[],
    processPartial: (partialConversation: Conversation) => void
  ) {
    if (
      !conversation.joules ||
      conversation.joules[conversation.joules.length - 1].author !== "human"
    ) {
      throw new Error("Cannot respond to non-human message");
    }
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

    const systemPrompt = prompts.codeModeSystemPrompt();

    const claudeConversation: ClaudeConversation = {
      system: systemPrompt,
      messages: [
        // TODOV2 user system info
        ...this.codebaseView(gitRepo, contextPaths, repoMapString),
        ...this.encodeMessages(conversation),
      ],
    };

    console.log("CLAUDE CONVERSATION: ", claudeConversation);

    // TODO 200: get five responses, pick the best one with pickResponse
    // TODO 400: write a claudePlus

    let partialMessage = "";
    const finalResponse = await claudeAPI.streamClaude(
      claudeConversation,
      async (responseFragment: string) => {
        partialMessage += responseFragment;
        const newConversation = await this.claudeOutputToConversation(
          conversation,
          partialMessage,
          true,
          contextPaths,
          gitRepo,
          true // ignore changes
        );
        processPartial(newConversation);
      }
    );
    console.log(finalResponse);

    return await this.claudeOutputToConversation(
      conversation,
      finalResponse,
      false,
      contextPaths,
      gitRepo,
      false // apply changes
    );
  }

  private async claudeOutputToConversation(
    prevConversation: Conversation,
    response: string,
    partialMode: boolean,
    contextPaths: string[],
    gitRepo: GitRepo,
    ignoreChanges: boolean
  ): Promise<Conversation> {
    const { messageChunksList, searchReplaceList } = parser.splitResponse(
      response,
      partialMode
    );
    const changeSet = ignoreChanges
      ? changeSets.createEmpty()
      : await this.applyChanges(gitRepo, searchReplaceList);

    const nextJoule = await this.nextJoule(
      changeSet,
      gitRepo,
      messageChunksList.join("\n"),
      {
        rawOutput: response,
        contextPaths: contextPaths,
        assistantType: "coder",
      },
      partialMode
    );

    return conversations.addJoule(prevConversation, nextJoule);
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

  private async nextJoule(
    changeSet: ChangeSet,
    gitRepo: GitRepo,
    message: string,
    botExecInfo: BotExecInfo,
    partialMode: boolean
  ): Promise<Joule> {
    if (changeSets.isEmpty(changeSet)) {
      return joules.createJouleBot(
        message,
        botExecInfo,
        partialMode ? "partial" : "complete"
      );
    } else {
      const commitMessage = await generateCommitMessage(
        utils.getDiffPreviewFromChangeSet(changeSet),
        message
      );
      const newCommit = await changeSets.commitChangeSet(
        changeSet,
        gitRepo,
        commitMessage
      );
      const diffInfo = {
        diffPreview: await utils.getUdiffPreviewFromCommit(gitRepo, newCommit),
        filePathsChanged: Array.from(Object.keys(changeSet.filesChanged)),
      };
      return joules.createJouleBotWithChanges(
        message,
        botExecInfo,
        newCommit,
        diffInfo,
        partialMode ? "partial" : "complete"
      );
    }
  }
}
