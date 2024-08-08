import {
    Joule,
    JouleBot,
    Mode,
    ClaudeConversation,
    ClaudeMessage,
    Conversation,
    GitRepo,
    PseudoCommit,
} from "../types";
import * as joules from "../backend/joules";
import * as prompts from "../backend/prompts";
import * as claudeAPI from "../backend/claudeAPI";
import * as pseudoCommits from "../backend/pseudoCommits";
import { Assistant } from "./assistant";
import * as conversations from "../backend/conversations";

export class Architect implements Assistant {
    async respond(
        conversation: Conversation,
        gitRepo: GitRepo,
        contextPaths: string[],
        mode: Mode,
        processPartial: (partialJoule: Joule) => void
    ) {
        const currentPseudoCommit = conversations.lastJoule(conversation)!.pseudoCommit;
        const systemPrompt = prompts.architectModeSystemPrompt();

        const claudeConversation: ClaudeConversation = {
            system: systemPrompt,
            messages: [
                ...this.encodeContext(gitRepo, currentPseudoCommit, contextPaths),
                ...this.encodeMessages(conversation),
            ]
        };

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

        const newJoule = joules.createJouleBot(
            finalResponse,
            mode,
            currentPseudoCommit,
            contextPaths
        );
        const newConversation = conversations.addJoule(conversation, newJoule);
        return newConversation;
    }

    // copied from Coder
    private encodeMessages(conversation: Conversation): ClaudeMessage[] {
        return conversation.joules.map((joule: Joule) => {
            return {
                role: joule.author === "human" ? "user" : "assistant",
                content: joule.message.length ? joule.message : "...", // appease Claude, who demands all messages be non-empty
            };
        });
    }

    // copied from Coder
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
}