import { Conversation, ClaudeMessage, Joule, JouleType, ContextPaths } from "../../types";
import * as joules from "../joules";
import fs from "fs";
import path from "path";
import { getUserPrompt } from "../../util/config";
import * as vscode from "vscode";

export abstract class BaseAssistant {
	static get description(): string {
		throw new Error("Description must be implemented in subclass");
	}

	abstract responders: Map<JouleType, (
		conversation: Conversation,
		contextPaths: ContextPaths,
		sendPartialJoule: (partialJoule: Joule) => void,
		cancellationToken?: vscode.CancellationToken
	) => Promise<Joule>>;

	protected encodeUserPrompt(): ClaudeMessage[] {
		const userPrompt = getUserPrompt();
		return [{
			role: "user",
			content: userPrompt,
		}, {
			role: "assistant",
			content: "Understood. I'll keep that in mind throughout our conversation.",
		}
		];
	}

	protected encodeMessages(conversation: Conversation): ClaudeMessage[] {
		return [
			...conversation.joules.map(joules.encodeJouleForClaude)
		].filter(m => m !== null);
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
${repoMapString ? repoMapString : "[No file summaries available.]"}
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
			// { role: "assistant", content: "Thanks, I'll review this carefully." },
		];
	}
}
