import { Conversation, ClaudeMessage, Joule, ContextPaths } from "../../types";
import * as joules from "../joules";
import fs from "fs";
import path from "path";
import { getUserPrompt } from "../../util/config";

export abstract class BaseAssistant {
	static get description(): string {
		throw new Error("Description must be implemented in subclass");
	}

	abstract respond(
		conversation: Conversation,
		contextPaths: ContextPaths,
		processPartial: (partialConversation: Conversation) => void
	): Promise<Conversation>;

	protected encodeMessages(conversation: Conversation): ClaudeMessage[] {
		const userPrompt = getUserPrompt();
		const messages: ClaudeMessage[] = [];

		if (userPrompt) {
			messages.push({
				role: "user",
				content: userPrompt,
			});
			messages.push({
				role: "assistant",
				content:
					"Understood. I'll keep that in mind throughout our conversation.",
			});
		}

		function authorToRole(author: "human" | "bot"): "user" | "assistant" {
			return author === "human" ? "user" : "assistant";
		}

		messages.push(
			...conversation.joules.map((joule: Joule) => ({
				role: authorToRole(joule.author),
				content: joules.formatMessageForClaude(joule),
			}))
		);

		return messages;
	}

	/**
	 * Encodes files for Claude. Note that we're being loose with the newlines.
	 * @returns string encoding the files
	 */
	protected encodeFile(relativeFilePath: string, meltyRoot: string): string {
		const fileContents = fs.readFileSync(
			path.join(meltyRoot, relativeFilePath),
			"utf8"
		);

		// TODO should we use | indentation here?
		return `<file_contents file=${relativeFilePath}>
${fileContents.endsWith("\n") ? fileContents : fileContents + "\n"}
</file_contents>`;
	}

	protected codebaseView(
		contextPaths: ContextPaths,
		repoMapString: string
	): ClaudeMessage[] {
		const codebaseSummary = `<codebase_summary>
${repoMapString ? repoMapString : "[No summary provided.]"}
</codebase_summary>`;

		const fileContents = contextPaths.paths
			.map((path) => this.encodeFile(path, contextPaths.meltyRoot))
			.join("\n");

		return [
			{
				role: "user",
				content: `<codebase_view>
${codebaseSummary}
${fileContents}
</codebase_view>`,
			},
			{ role: "assistant", content: "Thanks, I'll review this carefully." },
		];
	}
}
