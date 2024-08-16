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

export async function applyByAnyMeansNecessary(
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

        const newContent = searchReplaces.reduce(
          (content: string | undefined, searchReplace: SearchReplace) => {
            if (content) {
              return applyByExactMatch(content, searchReplace);
            }
            return undefined;
          },
          fileContent
        );

        if (newContent) {
          return { filePath, content: newContent };
        }

        // fall back to haiku
        console.log(
          `Falling back to haiku diff application for ${filePath}...`
        );
        vscode.window.showInformationMessage(
          `Falling back to haiku diff application for ${filePath}...`
        );

        fileContent = await applySearchReplaceHaiku(
          fileContent,
          searchReplaces
        );

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
  searchReplaces: SearchReplace[]
): Promise<string> {
  const formatDiff = (searchReplace: SearchReplace) => {
    return `${parser.DIFF_OPEN}
${searchReplace.search}
${parser.DIFF_DIVIDER}
${searchReplace.replace}
${parser.DIFF_CLOSE}`;
  };
  const claudeConversation: ClaudeConversation = {
    system: "",
    messages: [
      {
        role: "user",
        content: `${prompts.diffApplicationSystemPrompt(
          fileContent,
          searchReplaces.map(formatDiff).join("\n\n")
        )}`,
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

function applyByExactMatch(
  originalContents: string,
  searchReplace: SearchReplace
): string | undefined {
  if (!originalContents.includes(searchReplace.search)) {
    console.error("failed to apply diff");
    console.error("search string:");
    console.error(searchReplace.search);
    console.error("search string trimmed:");
    console.error(searchReplace.search.trim());
    console.error("replace string:");
    console.error(searchReplace.replace);
    return undefined;
  }
  const updatedContent = originalContents.replace(
    searchReplace.search,
    searchReplace.replace
  );
  return updatedContent;
}
