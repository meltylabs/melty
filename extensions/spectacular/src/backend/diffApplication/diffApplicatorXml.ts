import { SearchReplace, ChangeSet } from "types";
import * as vscode from "vscode";
import fs from "fs";
import path from "path";
import * as meltyFiles from "backend/meltyFiles";
import { diffApplicationStrategies } from "./diffApplicationStrategies";

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
		Object.entries(groupedSearchReplaceBlocks).map(
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
						console.error(`Failed to apply change to ${filePath}`);
						vscode.window.showWarningMessage(
							`Failed to apply a change to ${filePath}`
						);
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
