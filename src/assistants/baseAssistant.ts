import {
    Conversation,
    GitRepo,
    Mode,
    ClaudeMessage,
    PseudoCommit,
} from "../types";
import * as prompts from "../backend/prompts";
import * as pseudoCommits from "../backend/pseudoCommits";
import * as joules from "../backend/joules";

export abstract class BaseAssistant {
    abstract respond(
        conversation: Conversation,
        gitRepo: GitRepo,
        contextPaths: string[],
        processPartial: (partialConversation: Conversation) => void
    ): Promise<Conversation>;

    protected encodeMessages(conversation: Conversation): ClaudeMessage[] {
        return conversation.joules.map((joule) => ({
            role: joule.author === "human" ? "user" : "assistant",
            content: joules.formatMessageForClaude(joule),
        }));
    }

    /**
     * Encodes files for Claude. Note that we're being loose with the newlines.
     * @returns string encoding the files
     */
    protected encodeFile(
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

    protected encodeContext(
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
}
