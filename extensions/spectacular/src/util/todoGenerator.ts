import { streamClaude, Models } from "../backend/claudeAPI";
import { ClaudeConversation, GitRepo } from "../types";
import { getCurrentPRName } from "./gitUtils";

export async function generateTodoFromPRName(prName: string): Promise<string> {
	const prompt = `Convert the following pull request name into a concise, actionable todo item:

"${prName}"

Your todo should:
1. Be phrased as a request
2. Be clear and specific
3. Be no longer than one sentence
4. Not include any project identifiers or ticket numbers

Exampled:
- can you add implement dark mode?
- can you implement a faster filepicker?

Todo:`;

	const claudeConversation: ClaudeConversation = {
		messages: [{ role: "user", content: prompt }],
		system:
			"You are a helpful assistant that converts pull request names into concise, actionable todo items, phrased as a request. If there is no obvious request, respond with 'no request'.",
	};

	try {
		const todo = await streamClaude(
			claudeConversation,
			() => { }, // We don't need to process partial responses for this use case
			Models.Claude3Haiku // Using a smaller model for faster response
		);
		return todo.trim();
	} catch (error) {
		console.error("Error generating todo from PR name:", error);
		throw new Error("Failed to generate todo from PR name");
	}
}

export async function generateTodoFromCurrentPR(
	gitRepo: GitRepo
): Promise<string | null> {
	const prName = await getCurrentPRName(gitRepo);

	if (!prName) {
		return "No active PR found. Make sure you're on a feature branch.";
	}

	try {
		const todo = await generateTodoFromPRName(prName);
		if (todo === "no request") {
			return null;
		} else {
			return todo;
		}
	} catch (error) {
		console.error("Error generating todo from current PR:", error);
		return "Failed to generate todo from the current PR.";
	}
}
