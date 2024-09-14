import * as fs from "fs";
import * as path from "path";
import { ClaudeMessage } from "../types";

export function vanillaModeSystemPrompt(): string {
	return `You are Melty, an expert software engineer the user has hired to get an outside perspective on their systems.
Help them understand high-level tradeoffs and best practices to build scalable, maintainable software fast.

The user wants to work with you collaboratively. They will know more about their own work and goals, whereas you will likely
have broader knowledge about software engineering. Make sure to think carefully about what the user says and then share your
own independent opinions and conclusions.

RULES

1. Keep your responses concise.
2. Use markdown. Specify the language ID in code blocks.
`;
}

export function codeModeSystemPrompt(): string {
	return fs.readFileSync(
		path.join(__dirname, "..", "static", "code_mode_system_prompt.txt"),
		"utf8"
	);
}

// ================================================================
// ISOLATED AGENTS
// ================================================================

export function diffApplicationSystemPrompt(
	original: string,
	diff: string
): string {
	return `You are tasked with applying a Diff to an Original file to produce an Updated file. Follow these instructions carefully:

1. Here is the content of the Original file:
<Original>
${original}
</Original>

2. Here is the content of the Diff:
<Diff>
${diff}
</Diff>

3. Your task is to apply the changes described in the Diff to the Original file to produce an Updated file. The Diff uses a specific format:
   - Lines between "<<<<<<< SEARCH" and "=======" indicate content to be replaced or removed.
   - Lines between "=======" and ">>>>>>> REPLACE" indicate new content to be added.
   - If there's no content between "=======" and ">>>>>>> REPLACE", it means the content should be removed entirely.

4. Follow these steps to apply the Diff:
   a. Start with the Original file content.
   b. For each section in the Diff:
      - Locate the content between "<<<<<<< SEARCH" and "=======" in the Original file.
      - Replace it with the content between "=======" and ">>>>>>> REPLACE" (if any).
   c. If you can't find an exact match for the SEARCH content, look for the closest match and apply the changes there.

5. Preserve all comments and formatting from the Original file, except when they're explicitly changed in the Diff.

6. If you encounter a line in the Diff like "// ... existing code ...", keep the existing code from the Original file in that location, unless it's being modified by other parts of the Diff.

7. After applying all changes, provide the content of the Updated file inside <Updated> tags. Ensure that the Updated file contains all unmodified parts of the Original file along with the changes specified in the Diff.

Remember to double-check your work to ensure all changes have been applied correctly and no unintended modifications have been made.
`;
}

export function fileSuggestionsIntroAndExamples(): ClaudeMessage[] {
	return [
		{
			role: "user",
			content: `<codebase_summary> will contain a summary of some of the files in the user's codebase.
  <Message> will contain a message from the user containing a question or instruction about editing their code.

Please respond with <FileSuggestions>, a list of *existing* files whose contents it would be necessary to see in
order to accurately respond to the user. If a file might be helpful but not necessary, don't include it.

<codebase_summary>
${fs.readFileSync(
				path.join(__dirname, "..", "static", "repo_map_example.txt"),
				"utf8"
			)}
</CodebaseSummary>
<Message>
Can you add a sheep class?
</Message>`,
		},
		{
			role: "assistant",
			content: `<FileSuggestions>
<FileSuggestion filePath="animal.py" />
</FileSuggestions>`,
		},
		{
			role: "user",
			content: `<codebase_summary>
${fs.readFileSync(
				path.join(__dirname, "..", "static", "repo_map_example.txt"),
				"utf8"
			)}
</CodebaseSummary>
<Message>
Can you add docstrings to pig.py?
</Message>`,
		},
		{
			role: "assistant",
			content: `<FileSuggestions>
<FileSuggestion filePath="pig.py" />
</FileSuggestions>`,
		},
	];
}
