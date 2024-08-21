import {
  GitRepo,
  SearchReplace,
  ClaudeConversation,
  ChangeSet,
} from "../types";
import * as claudeAPI from "../backend/claudeAPI";
import * as prompts from "../backend/prompts";
import * as vscode from "vscode";
import * as parser from "../diffApplication/parser";
import fs from "fs";
import path from "path";
import * as meltyFiles from "../backend/meltyFiles";

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

        let newContent = searchReplaces.reduce(
          (content: string | undefined, searchReplace: SearchReplace) => {
            if (content) {
              return applyByExactMatch(content, searchReplace);
            }
            return undefined;
          },
          matchableOriginalContent
        );

        if (!newContent) {
          // fall back to haiku
          console.log(
            `Falling back to haiku diff application for ${filePath}...`
          );
          vscode.window.showInformationMessage(
            `Falling back to haiku diff application for ${filePath}...`
          );

          newContent = await searchReplaceToChangeSetByClaude(
            matchableOriginalContent,
            searchReplaces
          );
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

async function searchReplaceToChangeSetByClaude(
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
    "APPLYBYSONNET prompt",
    `SYSTEM: ${claudeConversation.system}
    MESSAGES: ${claudeConversation.messages}`
  );

  const response = await claudeAPI.streamClaude(
    claudeConversation,
    () => {},
    claudeAPI.Models.Claude35Sonnet
  );
  console.log("APPLYBYSONNET response", response);

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
