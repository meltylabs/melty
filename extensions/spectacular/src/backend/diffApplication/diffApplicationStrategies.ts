import { SearchReplace, ClaudeConversation } from "types";
import * as claudeAPI from "backend/claudeAPI";
import * as prompts from "backend/prompts";
import * as parser from "backend/diffApplication/parser";
import * as utils from "util/utils";

type DiffApplicationStrategy = (
	originalContents: string,
	searchReplace: SearchReplace
) => Promise<string | null>;

const applyByExactMatch: DiffApplicationStrategy = async (
	originalContents,
	searchReplace
) => {
	if (!originalContents.includes(searchReplace.search)) {
		return null;
	}
	return originalContents.replace(searchReplace.search, searchReplace.replace);
};

// export for testing
export const applyWithReindent: DiffApplicationStrategy = async (
	originalContents,
	searchReplace
) => {
	const lines = originalContents.split("\n");
	const searchLines = searchReplace.search.split("\n");
	const replaceLines = searchReplace.replace.split("\n");
	const firstSearchLine = searchLines[0].trim();

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].trim().includes(firstSearchLine)) {
			const precedingWhitespace = lines[i].match(/^\s*/)?.[0] || "";

			const reindentedSearch = searchLines
				.map((line) => precedingWhitespace + line)
				.join("\n");
			const reindentedReplace = replaceLines
				.map((line) => precedingWhitespace + line)
				.join("\n");

			const reindentedOriginal = originalContents.replace(
				reindentedSearch,
				reindentedReplace
			);

			if (reindentedOriginal !== originalContents) {
				return reindentedOriginal;
			}
		}
	}

	return null;
};

const applyByClaude: DiffApplicationStrategy = async (
	originalContents,
	searchReplace
) => {
	const formatDiff = (sr: SearchReplace) => `${parser.DIFF_OPEN}
${sr.search}
${parser.DIFF_DIVIDER}
${sr.replace}
${parser.DIFF_CLOSE}`;

	console.error("Falling back to applyByClaude following an issue:");
	// Add longest prefix match logging
	const { match, nonMatch } = utils.findLongestPrefixMatch(
		originalContents,
		searchReplace.search,
		10
	);
	console.error("Longest prefix match:", match);
	console.error("Non-matching characters:", nonMatch);
	console.error(originalContents);
	console.error(searchReplace);

	const claudeConversation: ClaudeConversation = {
		system: "",
		messages: [
			{
				role: "user",
				content: `${prompts.diffApplicationSystemPrompt(
					originalContents,
					formatDiff(searchReplace)
				)}`,
			},
			{
				role: "assistant",
				content: `<Updated>`,
			},
		],
	};

	const response = await claudeAPI.streamClaude(
		claudeConversation,
		() => { },
		claudeAPI.Models.Claude35Sonnet
	);

	// remove the closing
	return response.split("</Updated>")[0];
};

export const diffApplicationStrategies = [
	applyByExactMatch,
	applyWithReindent,
	applyByClaude,
];
