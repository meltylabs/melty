import { SearchReplace } from "../types";
import * as searchReplaces from "../backend/searchReplace";

export const CODE_FENCE = ["<CodeChange>", "</CodeChange>"];
export const DIFF_OPEN = "<<<<<<< SEARCH";
export const DIFF_DIVIDER = "=======";
export const DIFF_CLOSE = ">>>>>>> REPLACE";

type Section = "search" | "replace" | "codeChange" | "topLevel";

function stripFilename(filename: string): string | undefined {
  filename = filename.trim();

  if (filename === "...") {
    throw new Error(`Unable to get filename from: ${filename}`); // TODO: relax this to undefined
  }

  const startFence = CODE_FENCE[0];
  if (filename.startsWith(startFence)) {
    throw new Error(`Unable to get filename from: ${filename}`); // TODO: relax this to undefined
  }

  filename = filename.replace(/:$/, "");
  filename = filename.replace(/^#/, "");
  filename = filename.trim();
  filename = filename.replace(/^`|`$/g, "");
  filename = filename.replace(/^\*|\*$/g, "");
  filename = filename.replace(/\\_/g, "_");

  return filename;
}

function categorizeLine(
  rawLine: string
): "srOpen" | "srDivider" | "srClose" | "ccOpen" | "ccClose" | "other" {
  const line = rawLine.trim();

  const commandPieces = [
    DIFF_OPEN,
    DIFF_DIVIDER,
    DIFF_CLOSE,
    "<CodeChange",
    "</CodeChange>",
  ];
  const commandMatches = commandPieces.filter((piece) => line.includes(piece));
  if (!commandMatches.length) {
    return "other";
  } else if (commandMatches.length > 1) {
    throw new Error(`Line has multiple command pieces on it: ${line}`);
  } else if (!line.startsWith(commandMatches[0])) {
    throw new Error(`Line does not start with command piece: ${line}`);
  } else {
    switch (commandMatches[0]) {
      case DIFF_OPEN:
        return "srOpen";
      case DIFF_DIVIDER:
        return "srDivider";
      case DIFF_CLOSE:
        return "srClose";
      case "<CodeChange":
        return "ccOpen";
      case "</CodeChange>":
        return "ccClose";
      default:
        throw new Error(`Unexpected command piece: ${commandMatches[0]}`);
    }
  }
}

function nextSection(currentSection: Section, nextSection: Section): Section {
  const allowedTransitions: Record<Section, Section[]> = {
    search: ["replace"],
    replace: ["codeChange"],
    codeChange: ["topLevel", "search"],
    topLevel: ["codeChange"],
  };
  if (!allowedTransitions[currentSection].includes(nextSection)) {
    throw new Error(`Unexpected next section: ${nextSection}`);
  }
  return nextSection;
}

/**
 * Splits the response into search/replace blocks and message chunks.
 *
 * @param content The content to split
 * @param partialMode In partial mode, we expect a partial response, so we're more lenient in parsing
 * @returns The search/replace blocks and message chunks
 */
export function splitResponse(
  content: string,
  partialMode: boolean
): { searchReplaceList: SearchReplace[]; messageChunksList: string[] } {
  const searchReplaceList: SearchReplace[] = [];
  const messageChunksList: string[] = [""];
  let currentFile: string | null | undefined;
  let currentSearch: string[] = [];
  let currentReplace: string[] = [];
  let currentSection: Section = "topLevel";

  const lines = content.split("\n");

  for (const line of lines) {
    switch (categorizeLine(line)) {
      case "ccOpen":
        // // DISABLED -- parsed message strategy
        // messageChunksList.push("");

        // ENABLED -- raw message strategy (each CC is a chunk)
        messageChunksList.push("```codechange \n");

        try {
          currentFile = extractFileName(line);
        } catch (e) {
          if (partialMode) {
            currentFile = null;
          } else {
            throw e;
          }
        }
        currentSection = nextSection(currentSection, "codeChange");
        break;
      case "srOpen":
        // // DISABLED - parse message strategy
        // if (currentFile) {
        //   messageChunksList.push(`[Writing code for ${currentFile}...]\n`);
        // } else if (partialMode && currentFile === null) {
        //   messageChunksList.push("[Writing code for");
        // } else {
        //   throw new Error(`Unexpected file name ${currentFile}`);
        // }
        // messageChunksList.push("");
        currentSection = nextSection(currentSection, "search");
        break;
      case "srDivider":
        currentSection = nextSection(currentSection, "replace");
        break;
      case "srClose":
        // // DISABLED -- parsed message strategy
        // messageChunksList.push("");

        searchReplaceList.push(
          searchReplaces.create(
            currentFile!,
            currentSearch.join("\n") + "\n", // match whole lines only
            currentReplace.join("\n") + "\n"
          )
        );
        currentSearch = [];
        currentReplace = [];
        currentSection = nextSection(currentSection, "codeChange");
        break;
      case "ccClose":
        currentFile = undefined; // we could maybe relax this later
        currentSection = nextSection(currentSection, "topLevel");
        break;
      case "other":
        if (currentSection === "search") {
          currentSearch.push(line);
        } else if (currentSection === "replace") {
          currentReplace.push(line);
        } else if (currentSection === "topLevel") {
          // // DISABLED -- parsed message strategy
          //   messageChunksList[messageChunksList.length - 1] += line + "\n";
        } else {
          // otherwise, it's in CodeChange but not in search/replace
          console.log("ignoring stray line in CodeChange: ", line);
        }
        break;
    }
    // ENABLED -- raw message strategy (all lines included in chunks)
    messageChunksList[messageChunksList.length - 1] += line + "\n";
    if (categorizeLine(line) === "ccClose") {
      messageChunksList[messageChunksList.length - 1] += "```\n";
      messageChunksList.push("\n");
    }
  }

  return {
    messageChunksList,
    searchReplaceList,
  };
}

function extractFileName(line: string): string | undefined {
  const match = line.match(/file="([^"]*)"/);
  if (!match || match.length !== 2) {
    throw new Error(`Unable to get filename from: ${line}`); // TODO: relax this to undefined
  }
  return stripFilename(match[1]);
}
