import {
  Conversation,
  GitRepo,
  Mode,
  ClaudeConversation,
  PseudoCommit,
  ClaudeMessage,
} from "../types";
import * as pseudoCommits from "../backend/pseudoCommits";
import * as joules from "../backend/joules";
import * as prompts from "../backend/prompts";
import * as claudeAPI from "../backend/claudeAPI";
import * as diffApplicatorXml from "../backend/diffApplicatorXml";
import { RepoMapSpec } from "../backend/repoMapSpec";
import * as utils from "../util/utils";
import * as conversations from "../backend/conversations";
import { BaseAssistant } from "./baseAssistant";

export class Coder extends BaseAssistant {
  async respond(
    conversation: Conversation,
    gitRepo: GitRepo,
    contextPaths: string[],
    mode: Mode,
    processPartial: (partialConversation: Conversation) => void
  ) {
    const currentPseudoCommit =
      conversations.lastJoule(conversation)!.pseudoCommit;

    // TODO 100: Add a loop here to try to correct the response if it's not good yet
    // TODO 300: (abstraction over 100 and 200): Constructing a unit of work might require multiple LLM steps: find context, make diff, make corrections.
    // We can try each step multiple times. All attempts should be represented by a tree. We pick one leaf to respond with.

    const systemPrompt = this.getSystemPrompt(mode);

    const claudeConversation: ClaudeConversation = {
      system: systemPrompt,
      messages: [
        // TODOV2 user system info
        ...(await this.encodeRepoMap(gitRepo, currentPseudoCommit)),
        ...this.encodeContext(gitRepo, currentPseudoCommit, contextPaths),
        ...this.encodeMessages(conversation),
      ],
    };

    // TODO 200: get five responses, pick the best one with pickResponse
    // TODO 400: write a claudePlus

    // let partialJoule = joules.createJouleBot("", mode, currentPseudoCommit, contextPaths);
    let partialMessage = "";
    const finalResponse = await claudeAPI.streamClaude(
      claudeConversation,
      (responseFragment: string) => {
        partialMessage += responseFragment;
        const { messageChunksList, searchReplaceList } =
          diffApplicatorXml.splitResponse(partialMessage, true);
        const newPseudoCommit = this.getNewPseudoCommit(
          gitRepo,
          currentPseudoCommit,
          mode,
          searchReplaceList
        );
        const partialJoule = joules.createJouleBot(
          messageChunksList.join("\n"),
          partialMessage,
          mode,
          newPseudoCommit,
          contextPaths
        );
        processPartial(conversations.addJoule(conversation, partialJoule));
      }
    );
    console.log(finalResponse);

    const { messageChunksList, searchReplaceList } =
      diffApplicatorXml.splitResponse(finalResponse, false);

    const newPseudoCommit = this.getNewPseudoCommit(
      gitRepo,
      currentPseudoCommit,
      mode,
      searchReplaceList
    );
    const newJoule = joules.createJouleBot(
      messageChunksList.join("\n"),
      finalResponse,
      mode,
      newPseudoCommit,
      contextPaths
    );
    return conversations.addJoule(conversation, newJoule);
  }

  private getSystemPrompt(mode: Mode): string {
    switch (mode) {
      case "code":
        return (
          prompts.codeModeSystemPrompt() +
          prompts.diffDecoderPrompt() +
          prompts.exampleConversationsPrompt() +
          prompts.codeChangeCommandRulesPrompt()
        );
      case "ask":
        return prompts.askModeSystemPrompt();
      default:
        throw new Error(`Unsupported mode: ${mode}`);
    }
  }

  private async encodeRepoMap(
    gitRepo: GitRepo,
    pseudoCommit: PseudoCommit
  ): Promise<ClaudeMessage[]> {
    const repoMap = new RepoMapSpec(gitRepo);
    const workspaceFilePaths = await utils.getWorkspaceFilePaths(gitRepo);
    return [
      {
        role: "user",
        content: `${prompts.repoMapIntro()}\n\n${await repoMap.getRepoMap(
          workspaceFilePaths
        )}`,
      },
      { role: "assistant", content: prompts.repoMapAsstAck() },
    ];
  }

  /**
   * Creates a new pseudo commit representing changes (if there are any) on top of currentPseudoCommit.
   */
  private getNewPseudoCommit(
    gitRepo: GitRepo,
    currentPseudoCommit: PseudoCommit,
    mode: Mode,
    searchReplaceList: any[]
  ) {
    // Reset the diff preview
    const pseudoCommitNoDiff =
      pseudoCommits.createFromPrevious(currentPseudoCommit);

    return mode === "code"
      ? diffApplicatorXml.applySearchReplaceBlocks(
          gitRepo,
          pseudoCommitNoDiff,
          searchReplaceList
        )
      : pseudoCommitNoDiff;
  }
}
