import { SearchReplace, ChangeSet } from "types";
import * as vscode from "vscode";
import fs from "fs";
import path from "path";
import * as meltyFiles from "backend/meltyFiles";
import { diffApplicationStrategies } from "./diffApplicationStrategies";
import * as utils from "util/utils";
import posthog from "posthog-js";

export async function searchReplaceToChangeSet(
	searchReplaceBlocks: SearchReplace[],
	meltyRoot: string
): Promise<ChangeSet> {
	// Group SearchReplace objects by file name
	const groupedSearchReplaceBlocks: Map<string, SearchReplace[]> = new Map<string, SearchReplace[]>();
	searchReplaceBlocks.forEach(searchReplace => {
		if (!groupedSearchReplaceBlocks.has(searchReplace.filePath)) {
			groupedSearchReplaceBlocks.set(searchReplace.filePath, []);
		}
		groupedSearchReplaceBlocks.get(searchReplace.filePath)?.push(searchReplace);
	});

	// Apply changes in parallel across files
	const changeSetValues = await Promise.all(
		Array.from(groupedSearchReplaceBlocks,
			async ([filePath, searchReplaces]) => {
				const rawOriginalContent = fs.existsSync(
					path.join(meltyRoot, filePath)
				)
					? fs.readFileSync(path.join(meltyRoot, filePath), "utf8")
					: "";

				const matchableOriginalContent =
					rawOriginalContent !== "" ? rawOriginalContent : "\n\n";

				let newContent = matchableOriginalContent;

				for (const searchReplace of searchReplaces) {
					let applied = false;
					for (const [index, strategy] of diffApplicationStrategies.entries()) {
						const strategyResult = await strategy(newContent, searchReplace);
						if (strategyResult !== null) {
							newContent = strategyResult;
							applied = true;
							console.log(
								`Applied change using strategy ${index} (${strategy.name}) for ${filePath}`
							);
							break;
						}
					}
					if (!applied) {
						console.warn(`Failed to apply change to ${filePath}`);
						// Add longest prefix match logging
						const { match, nonMatch } = utils.findLongestPrefixMatch(
							newContent,
							searchReplace.search,
							10
						);
						const details = `Longest prefix match:
==========
${match}
==========

Non-matching characters:
==========
${nonMatch}
==========

New content:
==========
${newContent}
==========

Search replace:
==========
${searchReplace}
==========`;
						console.warn(details);
						vscode.window.showErrorMessage(
							`Failed to apply change to ${filePath}`
						);

						posthog.capture("melty_errored", {
							type: "diff_app_error",
							errorMessage: `Failed to apply change to ${filePath}`,
							context: details
						});
					}
				}

				return [
					filePath,
					{
						original: meltyFiles.create(filePath, rawOriginalContent),
						updated: meltyFiles.create(filePath, newContent),
					},
				];
			}
		)
	);

	return { filesChanged: Object.fromEntries(changeSetValues) };
}
