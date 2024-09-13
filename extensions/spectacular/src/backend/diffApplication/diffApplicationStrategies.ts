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

export const diffApplicationStrategies = [
	applyByExactMatch,
	applyWithReindent,
];
