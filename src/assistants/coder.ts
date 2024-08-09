import {
  Joule,
  JouleBot,
  Mode,
  ClaudeConversation,
  ClaudeMessage,
  PseudoCommit,
  Conversation,
  GitRepo,
} from "../types";
import * as pseudoCommits from "../backend/pseudoCommits";
import * as joules from "../backend/joules";
import * as prompts from "../backend/prompts";
import * as claudeAPI from "../backend/claudeAPI";
import * as diffApplicatorXml from "../backend/diffApplicatorXml";
import { RepoMapSpec } from "../backend/repoMapSpec";
import * as utils from "../util/utils";
import { Assistant } from "./assistant";
import * as conversations from "../backend/conversations";

export class Coder implements Assistant {
  async respond(
    conversation: Conversation,
    gitRepo: GitRepo,
    contextPaths: string[],
    mode: Mode,
    processPartial: (partialJoule: Joule) => void
  ) {
    const currentPseudoCommit =
      conversations.lastJoule(conversation)!.pseudoCommit;
    // TODO 100: Add a loop here to try to correct the response if it's not good yet

    // TODO 300 (abstraction over 100 and 200): Constructing a unit of work might require multiple LLM steps: find context, make diff, make corrections.
    // We can try each step multiple times. All attempts should be represented by a tree. We pick one leaf to respond with.

    const systemPrompt = (() => {
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
      }
    })();

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

    // TODOV2 write a claudePlus
    let partialJoule = joules.createJouleBot(
      "",
      mode,
      currentPseudoCommit,
      contextPaths
    );
    const finalResponse = await claudeAPI.streamClaude(
      claudeConversation,
      (responseFragment: string) => {
        partialJoule = joules.updateMessage(
          partialJoule,
          partialJoule.message + responseFragment
        ) as JouleBot;
        processPartial(partialJoule);
      }
    );
    console.log(finalResponse);

    const { messageChunksList, searchReplaceList } =
      diffApplicatorXml.splitResponse(finalResponse);

    // reset the diff preview
    const pseudoCommitNoDiff =
      pseudoCommits.createFromPrevious(currentPseudoCommit);

    const newPseudoCommit =
      mode === "code"
        ? diffApplicatorXml.applySearchReplaceBlocks(
            gitRepo,
            pseudoCommitNoDiff,
            searchReplaceList
          )
        : pseudoCommitNoDiff;

    const newJoule = joules.createJouleBot(
      messageChunksList.join("\n"),
      mode,
      newPseudoCommit,
      contextPaths
    );
    const newConversation = conversations.addJoule(conversation, newJoule);
    return newConversation;
  }

  /**
   * Encodes files for Claude. Note that we're being loose with the newlines.
   * @returns string encoding the files
   */
  private encodeFile(
    gitRepo: GitRepo,
    pseudoCommit: PseudoCommit,
    path: string
  ) {
    const fileContents = pseudoCommits.getFileContents(
      gitRepo,
      pseudoCommit,
      path
    );
    return `${path}
\`\`\`
${fileContents.endsWith("\n") ? fileContents : fileContents + "\n"}\`\`\``;
  }

  private encodeContext(
    gitRepo: GitRepo,
    pseudoCommit: PseudoCommit,
    contextPaths: string[]
  ): ClaudeMessage[] {
    // in the future, this could handle other types of context, like web urls
    const fileEncodings = contextPaths
      .map((path) => this.encodeFile(gitRepo, pseudoCommit, path))
      .join("\n");

    return fileEncodings.length
      ? [
          {
            role: "user",
            content: `${prompts.filesUserIntro()}

${fileEncodings}`,
          },
          { role: "assistant", content: prompts.filesAsstAck() },
        ]
      : [];
  }

  private async encodeRepoMap(
    gitRepo: GitRepo,
    pseudoCommit: PseudoCommit
  ): Promise<ClaudeMessage[]> {
    const repoMap = new RepoMapSpec(gitRepo);

    const workspaceFilePaths = await utils.getWorkspaceFilePaths(gitRepo);

    const repoMapMessages: ClaudeMessage[] = [
      {
        role: "user",
        content: `${prompts.repoMapIntro()}

      ${await repoMap.getRepoMap(workspaceFilePaths)}`,
      },
      { role: "assistant", content: prompts.repoMapAsstAck() },
    ];
    return repoMapMessages; // [];
  }

  private encodeMessages(conversation: Conversation): ClaudeMessage[] {
    return conversation.joules.map((joule: Joule) => {
      return {
        role: joule.author === "human" ? "user" : "assistant",
        content: joule.message.length ? joule.message : "...", // appease Claude, who demands all messages be non-empty
      };
    });
  }
}
