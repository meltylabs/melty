import { Conversation, GitRepo, Mode, ClaudeMessage, PseudoCommit } from "../types";
import * as prompts from "../backend/prompts";
import * as pseudoCommits from "../backend/pseudoCommits";

export abstract class BaseAssistant {
    protected encodeMessages(conversation: Conversation): ClaudeMessage[] {
        return conversation.joules.map((joule) => ({
            role: joule.author === "human" ? "user" : "assistant",
            content: joule.message.length ? joule.message : "...",
        }));
    }

    protected encodeFile(gitRepo: GitRepo, pseudoCommit: PseudoCommit, path: string): string {
        const fileContents = pseudoCommits.getFileContents(gitRepo, pseudoCommit, path);
        return `${path}\n\`\`\`\n${fileContents.endsWith("\n") ? fileContents : fileContents + "\n"}\`\`\``;
    }

    protected encodeContext(gitRepo: GitRepo, pseudoCommit: PseudoCommit, contextPaths: string[]): ClaudeMessage[] {
        const fileEncodings = contextPaths
            .map((path) => this.encodeFile(gitRepo, pseudoCommit, path))
            .join("\n");

        return fileEncodings.length
            ? [
                {
                    role: "user",
                    content: `${prompts.filesUserIntro()}\n\n${fileEncodings}`,
                },
                { role: "assistant", content: prompts.filesAsstAck() },
            ]
            : [];
    }

    abstract respond(
        conversation: Conversation,
        gitRepo: GitRepo,
        contextPaths: string[],
        mode: Mode,
        processPartial: (partialConversation: Conversation) => void
    ): Promise<Conversation>;
}