import {
  PseudoCommit,
  GitRepo,
  SearchReplace,
  ClaudeConversation,
} from "../types";
import * as pseudoCommits from "../backend/pseudoCommits";
import * as claudeAPI from "../backend/claudeAPI";
import * as prompts from "../backend/prompts";
import * as vscode from "vscode";
import * as parser from "../diffApplication/parser";

export function applySearchReplaceBlocks(
  gitRepo: GitRepo,
  pseudoCommit: PseudoCommit,
  searchReplaceBlocks: SearchReplace[]
): PseudoCommit {
  return searchReplaceBlocks.reduce((pseudoCommit, searchReplace) => {
    return applySearchReplace(gitRepo, pseudoCommit, searchReplace);
  }, pseudoCommit);
}

export async function applyByHaiku(
  gitRepo: GitRepo,
  pseudoCommit: PseudoCommit,
  searchReplaceBlocks: SearchReplace[]
): Promise<PseudoCommit> {
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
  const updatedContents = await Promise.all(
    Object.entries(groupedSearchReplaceBlocks).map(
      async ([filePath, searchReplaces]) => {
        let fileContent = pseudoCommits.hasFile(gitRepo, pseudoCommit, filePath)
          ? pseudoCommits.getFileContents(gitRepo, pseudoCommit, filePath)
          : "\n\n";

        // Apply changes serially for each file
        for (const searchReplace of searchReplaces) {
          fileContent = await applySearchReplaceHaiku(
            fileContent,
            searchReplace
          );
        }

        return { filePath, content: fileContent };
      }
    )
  );

  // Update pseudoCommit with new file contents
  return updatedContents.reduce(
    (updatedPseudoCommit, { filePath, content }) => {
      return pseudoCommits.upsertFileContents(
        updatedPseudoCommit,
        filePath,
        content
      );
    },
    pseudoCommit
  );
}

async function applySearchReplaceHaiku(
  fileContent: string,
  searchReplace: SearchReplace
): Promise<string> {
  const claudeConversation: ClaudeConversation = {
    system: prompts.diffApplicationSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `<Original>${fileContent}</Original>
<Diff>
${parser.DIFF_OPEN}
${searchReplace.search}
${parser.DIFF_DIVIDER}
${searchReplace.replace}
${parser.DIFF_CLOSE}
</Diff>`,
      },
      {
        role: "assistant",
        content: `<Updated>`,
      },
    ],
  };

  console.log(
    "APPLYBYHAIKU prompt",
    `SYSTEM: ${claudeConversation.system}
    MESSAGES: ${claudeConversation.messages}`
  );

  const response = await claudeAPI.streamClaude(
    claudeConversation,
    () => {},
    claudeAPI.Models.Claude3Haiku
  );
  console.log("APPLYBYHAIKU response", response);

  // remove the closing </Updated> tag
  return response.split("</Updated>")[0];
}

function applySearchReplace(
  gitRepo: GitRepo,
  pseudoCommit: PseudoCommit,
  searchReplace: SearchReplace
): PseudoCommit {
  const originalContents = pseudoCommits.hasFile(
    gitRepo,
    pseudoCommit,
    searchReplace.filePath
  )
    ? pseudoCommits.getFileContents(
        gitRepo,
        pseudoCommit,
        searchReplace.filePath
      )
    : "\n\n"; // so that it has something to search for

  if (!originalContents.includes(searchReplace.search)) {
    console.error("failed to apply diff");
    console.error("search string:");
    console.error(searchReplace.search);
    console.error("search string trimmed:");
    console.error(searchReplace.search.trim());
    console.error("replace string:");
    console.error(searchReplace.replace);
    vscode.window.showErrorMessage(
      `Failed to apply diff: search text not found`
    );
    return pseudoCommit;
  }
  const updatedContent = originalContents.replace(
    searchReplace.search,
    searchReplace.replace
  );
  return pseudoCommits.upsertFileContents(
    pseudoCommit,
    searchReplace.filePath,
    updatedContent
  );
}
