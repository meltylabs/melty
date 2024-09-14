import { Conversation, ClaudeConversation } from "../types";
import { RepoMapSpec } from "./repoMapSpec";
import * as claudeAPI from "./claudeAPI";
import * as prompts from "./prompts";

/**
 * Given the conversation and repo map, tries to identify which files might be useful.
 */
export async function suggestContext(
	message: string,
	repoMap: RepoMapSpec
): Promise<string[]> {
	const claudeConversation: ClaudeConversation = {
		system: "",
		messages: [
			...prompts.fileSuggestionsIntroAndExamples(),
			{
				role: "user",
				content: `<codebase_summary>
${repoMap}
</CodebaseSummary>
<Message>
${message}
</Message>`,
			},
		],
	};

	const finalResponse = await claudeAPI.streamClaude(
		claudeConversation
	);

	const contextSuggestions =
		finalResponse.match(/(?<=<FileSuggestion filePath=")[^"]+(?=")/g) || [];

	if (!contextSuggestions) {
		return [];
	}

	return contextSuggestions;
}
