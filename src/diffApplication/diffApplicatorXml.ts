import { GitRepo, SearchReplace, ChangeSet } from "../types";
import * as vscode from "vscode";
import fs from "fs";
import path from "path";
import * as meltyFiles from "../backend/meltyFiles";
import { diffApplicationStrategies } from "./diffApplicationStrategies";

export async function searchReplaceToChangeSet(
  gitRepo: GitRepo,
  searchReplaceBlocks: SearchReplace[]
): Promise<ChangeSet> {
  // Group SearchReplace objects by file name
  const groupedSearchReplaceBlocks = searchReplaceBlocks.reduce(
    (acc, searchReplace) => {
      if (!acc[searchReplace.filePath]) {
        acc[searchReplace.filePath] = [];
      }
      acc[searchReplace.filePath].push(searchReplace);
      return acc;
    },
    {} as { [filePath: string]: SearchReplace[] }
  );

  // Apply changes in parallel across files
  const changeSetValues = await Promise.all(
    Object.entries(groupedSearchReplaceBlocks).map(
      async ([filePath, searchReplaces]) => {
        const rawOriginalContent = fs.existsSync(
          path.join(gitRepo.rootPath, filePath)
        )
          ? fs.readFileSync(path.join(gitRepo.rootPath, filePath), "utf8")
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
