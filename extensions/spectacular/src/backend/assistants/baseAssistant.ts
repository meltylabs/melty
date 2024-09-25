import { Conversation, ClaudeMessage, Joule, JouleType, ContextPaths, CodebaseView } from "../../types";
import * as joules from "../joules";
import fs from "fs";
import path from "path";
import { getUserPrompt } from "../../util/config";
import * as vscode from "vscode";
import * as claudeAPI from "../claudeAPI";

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
		return [
			claudeAPI.createClaudeMessage("user", userPrompt),
			claudeAPI.createClaudeMessage("assistant", "Understood. I'll keep that in mind throughout our conversation.")
		];
	}

	protected encodeJoules(jouleList: readonly Joule[]): ClaudeMessage[] {
		return [
			...jouleList.map(joules.encodeJouleForClaude)
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

	protected encodeCodebaseView(codebaseView: CodebaseView): ClaudeMessage[] {
		return [
			{
				role: "user",
				content: `<codebase_view>
${codebaseView.view}
</codebase_view>`
			},
			{
				role: "assistant",
				content: "Thanks, I'll review this carefully.",
			}
		];
	}

	protected finalCodebaseView(
		contextPaths: ContextPaths
	): ClaudeMessage[] {
		const fileContents = contextPaths.relativePaths
			.map((path) => this.encodeFile(path, contextPaths.meltyRoot))
			.join("\n");

		return [
			{
				role: "user",
				content: `<select_files_view>
${fileContents}
</select_files_view>`,
			},
			// { role: "assistant", content: "Thanks, I'll review this carefully." },
		];
	}
}
