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
  return searchReplaceBlocks.reduce(
    async (pseudoCommitPromise, searchReplace) => {
      const pseudoCommit = await pseudoCommitPromise;
      return applySearchReplaceHaiku(gitRepo, pseudoCommit, searchReplace);
    },
    Promise.resolve(pseudoCommit)
  );
}

async function applySearchReplaceHaiku(
  gitRepo: GitRepo,
  pseudoCommit: PseudoCommit,
  searchReplace: SearchReplace
): Promise<PseudoCommit> {
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

  const claudeConversation: ClaudeConversation = {
    system: prompts.diffApplicationSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `<Original>${originalContents}</Original>
<Diff>
<<<<<<< SEARCH
${searchReplace.search}
======
${searchReplace.replace}
>>>>>>> REPLACE
</Diff>`,
      },
      {
        role: "assistant",
        content: `<Updated>`,
      },
    ],
  };

  const response = await claudeAPI.streamClaude(
    claudeConversation,
    () => {},
    claudeAPI.Models.Claude3Haiku
  );

  // remove the closing </Updated> tag
  const updatedContent = response.split("</Updated>")[0];

  return pseudoCommits.upsertFileContents(
    pseudoCommit,
    searchReplace.filePath,
    updatedContent
  );
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
