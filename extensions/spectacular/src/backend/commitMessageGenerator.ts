import { Anthropic } from "@anthropic-ai/sdk";
import * as vscode from "vscode";

export async function generateCommitMessage(
	udiffPreview: string,
	accompanyingMessage: string = ""
): Promise<string> {
	const config = vscode.workspace.getConfiguration("melty");
	const apiKey = config.get<string>("anthropicApiKey");

	if (!apiKey) {
		throw new Error(
			"Anthropic API key is not set. Please configure it in settings."
		);
	}

	const anthropic = new Anthropic({
		apiKey: apiKey,
	});

	const prompt = `You are an expert software engineer.
Review the provided diff which is about to be committed to a git repo.
${accompanyingMessage
			? `Also review the accompanying message, which was part of a larger conversation and may contain
additional context about what's in the diff.`
			: ""
		}

Review the context carefully, then generate a commit message for the changes.
The commit message MUST use the imperative tense.
If the diff contains no files changed, you can just reply with "empty commit".
The commit message should be structured as follows: <type>: <description>
Use these for <type>: fix, feat, build, chore, ci, docs, style, refactor, perf, test

Example:

<commit_message>fix: Add logging to foo/bar/baz.py</commit_message>

Here is the context for the changes:

<diff>
${udiffPreview}
</diff>

${accompanyingMessage
			? `<accompanying_message>
${accompanyingMessage}
</accompanying_message>`
			: ""
		}
`;

	try {
		const response = await anthropic.messages.create({
			model: "claude-3-5-sonnet-20240620",
			max_tokens: 100,
			temperature: 0.7,
			messages: [
				{ role: "user", content: prompt },
				{ role: "assistant", content: "<commit_message>" },
			],
		});

		if (response.content.length > 0 && response.content[0].type === 'text') {
			const responseText = response.content[0].text.trim();
			const commitMessage = responseText.split("</commit_message>")[0].trim();
			return commitMessage;
		} else {
			let errorMessage: string;
			if (response.content.length === 0) {
				errorMessage = "No response from Anthropic API";
			} else if (response.content[0].type === 'tool_use') {
				errorMessage = "Response of type 'tool_use' received from Anthropic API. Expected 'text'.";
			} else {
				errorMessage = "Unknown error";
			}
			throw new Error(errorMessage);
		}
	} catch (error) {
		console.error("Error generating commit message:", error);
		return "bot changes";
	}
}
