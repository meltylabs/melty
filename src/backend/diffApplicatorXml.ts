import { RepoState } from './repoStates';
import * as repoStates from './repoStates';
import { SearchReplace } from './searchReplace';
import * as searchReplaces from './searchReplace';

const CODE_FENCE = ["<CodeChange>", "</CodeChange>"];
const DIFF_OPEN = "<<<<<<< SEARCH";
const DIFF_DIVIDER = "=======";
const DIFF_CLOSE = ">>>>>>> REPLACE";
const DIFF_PIECES = [DIFF_OPEN, DIFF_DIVIDER, DIFF_CLOSE];

type Section = "search" | "replace" | "codeChange" | "topLevel";

export const testExports = {
    applySearchReplace
};

export function applySearchReplaceBlocks(repoState: RepoState, searchReplaceBlocks: SearchReplace[]): RepoState {
    return searchReplaceBlocks.reduce((repoState, searchReplace) => {
        return applySearchReplace(repoState, searchReplace);
    }, repoState);
}

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


// function findFilename(lines: string[]): string | undefined {
//     for (const line of lines.reverse()) {
//         const trimmedLine = line.trim();
//         if (trimmedLine && !trimmedLine.startsWith("```") && !trimmedLine.includes(DIFF_OPEN)) {
//             return stripFilename(trimmedLine);
//         }
//     }
//     return undefined;
// }


// function ensurePiece(piece: string, expected: string) {
//     if (piece !== expected) {
//         throw new Error(`Unexpected piece: ${piece} does not match ${expected}`);
//     }
// }

function categorizeLine(rawLine: string): "srOpen" | "srDivider" | "srClose" | "ccOpen" | "ccClose" | "other" {
    const line = rawLine.trim();

    const commandPieces = [DIFF_OPEN, DIFF_DIVIDER, DIFF_CLOSE, "<CodeChange", "</CodeChange>"];
    const commandMatches = commandPieces.filter((piece) => line.includes(piece));
    if (!commandMatches.length) {
        return "other";
    }
    else if (commandMatches.length > 1) {
        throw new Error(`Line has multiple command pieces on it: ${line}`);
    } else if (!line.startsWith(commandMatches[0])) {
        throw new Error(`Line does not start with command piece: ${line}`);
    } else {
        switch (commandMatches[0]) {
            case DIFF_OPEN: return "srOpen";
            case DIFF_DIVIDER: return "srDivider";
            case DIFF_CLOSE: return "srClose";
            case "<CodeChange": return "ccOpen";
            case "</CodeChange>": return "ccClose";
            default: throw new Error(`Unexpected command piece: ${commandMatches[0]}`);
        }
    }
}

function nextSection(currentSection: Section, nextSection: Section): Section {
    const allowedTransitions: Record<Section, Section[]> = {
        "search": ["replace"],
        "replace": ["codeChange"],
        "codeChange": ["topLevel", "search"],
        "topLevel": ["codeChange"],
    };
    if (!allowedTransitions[currentSection].includes(nextSection)) {
        throw new Error(`Unexpected next section: ${nextSection}`);
    }
    return nextSection;
}

export function splitResponse(content: string): { searchReplaceList: SearchReplace[], messageChunksList: string[] } {
    const searchReplaceList: SearchReplace[] = [];
    const messageChunksList: string[] = [];
    let currentFile: string | undefined;
    let currentSearch: string[] = [];
    let currentReplace: string[] = [];
    let currentMessageChunk: string[] = [];
    let currentSection: Section = "topLevel";

    const lines = content.split('\n');

    for (const line of lines) {
        switch (categorizeLine(line)) {
            case "ccOpen":
                messageChunksList.push(currentMessageChunk.join("\n"));
                currentMessageChunk = [];

                currentFile = extractFileName(line);
                currentSection = nextSection(currentSection, "codeChange");
                break;
            case "srOpen":
                currentSection = nextSection(currentSection, "search");
                break;
            case "srDivider":
                currentSection = nextSection(currentSection, "replace");
                break;
            case "srClose":
                messageChunksList.push(`[Writing code for ${currentFile}...]`);
                searchReplaceList.push(searchReplaces.create(currentFile!,
                    currentSearch.join("\n") + "\n", // match whole lines only
                    currentReplace.join("\n") + "\n"
                ));
                currentSearch = [];
                currentReplace = [];
                currentSection = nextSection(currentSection, "codeChange");
                break;
            case "ccClose":
                currentFile = undefined; // we could maybe relax this later
                currentSection = nextSection(currentSection, "topLevel");
                break;
            case "other":
                if(currentSection === "search") {
                    currentSearch.push(line);
                } else if (currentSection === "replace") {
                    currentReplace.push(line);
                } else if(currentSection === "topLevel") {
                    currentMessageChunk.push(line);
                } else {
                    // otherwise, it's in CodeChange but not in search/replace
                    console.log("ignoring stray line in CodeChange: ", line);
                }
                break;
        }
    }

    return {
        messageChunksList,
        searchReplaceList
    };
}

function extractFileName(line: string): string | undefined {
    const match = line.match(/file="([^"]*)"/);
    if (!match || match.length !== 2) {
        throw new Error(`Unable to get filename from: ${line}`); // TODO: relax this to undefined
    }
    return stripFilename(match[1]);
}


// export function findSearchReplaceBlocks(content: string): SearchReplace[] {
//     const separators = DIFF_PIECES.join("|");
//     const splitRegex = new RegExp(`^((?:${separators})\s*\n)`, "gm");
//     // chunks are either content or a divider. reverse order.
//     const separatorChunks = content.split(splitRegex);

//     const searchReplaceChunks = separatorChunks.map((piece, index) => {
//         switch(index % 6) {
//             case 0: {
//                 return [{ type: "outside", fileName: findFilename(piece) }];
//             }
//             case 1: {
//                 ensurePiece(piece, DIFF_OPEN);
//                 return [];
//             }
//             case 2: {
//                 return [{ type: "search", content: piece }];
//             }
//             case 3: {
//                 ensurePiece(piece, DIFF_DIVIDER);
//                 return [];
//             }
//             case 4: {
//                 return [{ type: "replace", content: piece }];
//             }
//             case 5: {
//                 ensurePiece(piece, DIFF_CLOSE);
//                 return [];
//             }
//         }
//     });

//     const matches = content.matchAll(searchReplaceBlockRegex);
//     for (const match of matches) {
//         searchReplaceBlocks.push(match[1]);
//     }
//     return searchReplaceBlocks;
// }

// export function findUpdateBlocksJackson(content: string): Diff[] {
//     const separators = DIFF_PIECES.join("|");
//     const splitRegex = new RegExp(`^((?:${separators})\s*\n)`, "gm");

//     const missingFilenameErr = "Bad/missing filename. The filename must be alone on the line before the opening fence ```";

//     const contentWithNewline = content.endsWith("\n") ? content : content + "\n";

//     // chunks are either content or a divider. reverse order.
//     const pieces = contentWithNewline.split(splitRegex);

//     const piecesQueue = pieces.reverse();
//     const processedPieces: string[] = [];

//     let currentFilename: string | undefined;

//     let state = "open" as ("open" | "diff_head" | "search" | "diff_divider" | "replace" | "diff_close");
//     let filename: string | undefined;
//     let search: string | undefined;
//     let replace: string | undefined;

//     const diffs: Diff[];

//     while (piecesQueue.length) {
//         const currentPiece = piecesQueue.pop()!;
//         const trimmedPiece = currentPiece.trim();
//         processedPieces.push(currentPiece);

//         switch(state) {
//             case "open":
//                 ensurePiece(trimmedPiece, (piece) => !DIFF_PIECES.includes(piece), state);

//                 state = "diff_head";
//                 filename = findFilename(processedPieces);
//                 break;
//             case "diff_head":
//                 ensurePiece(trimmedPiece, (piece) => piece === DIFF_OPEN, state);
//                 state = "search";
//                 break;
//             case "search":
//                 ensurePiece(trimmedPiece, (piece) => !DIFF_PIECES.includes(piece), state);
//                 state = "diff_divider";
//                 break;
//             case "diff_divider":
//                 ensurePiece(trimmedPiece, (piece) => piece === DIFF_CLOSE, state);
//                 state = "replace";
//                 break;
//             case "replace":
//                 ensurePiece(trimmedPiece, (piece) => !DIFF_PIECES.includes(piece), state);
//                 state = "diff_close";
//                 break;
//             case "diff_close":
//                 ensurePiece(trimmedPiece, (piece) => piece === DIFF_OPEN, state);
//                 state = "open";

//                 break;
//         }
//     }
// }

// function* generateSearchReplaceBlocks(content: string, fence: string[] = ["```", "```"]): Generator<SearchReplace> {
//     const separators = DIFF_PIECES.join("|");
//     const splitRegex = new RegExp(`^((?:${separators})[ ]*\n)`, "gm");

//     const missingFilenameErr = "Bad/missing filename. The filename must be alone on the line before the opening fence ```";

//     if (!content.endsWith("\n")) {
//         content += "\n";
//     }

//     const pieces = content.split(splitRegex);
//     pieces.reverse();
//     const processed: string[] = [];

//     let currentFilename: string | undefined;

//     while (pieces.length) {
//         const cur = pieces.pop()!;

//         if (cur === DIFF_DIVIDER || cur === DIFF_CLOSE) {
//             processed.push(cur);
//             throw new Error(`Unexpected ${cur}`);
//         }

//         if (cur.trim() !== DIFF_OPEN) {
//             processed.push(cur);
//             continue;
//         }

//         const preSearchChunk = processed[processed.length - 1];
//         processed.push(cur); // original_marker

//         let filename = (() => {
//             const linesToSearch = preSearchChunk.split("\n").slice(-3);
//             const explicitFilename = findFilename(linesToSearch);
//             if (explicitFilename) { return explicitFilename; }
//             if (currentFilename) { return currentFilename; }
//             throw new Error(missingFilenameErr);
//         })();

//         // update for next go-around
//         currentFilename = filename;

//         if (pieces.length < 4) {
//             throw new Error("Incomplete SEARCH/REPLACE block.");
//         }

//         const originalText = pieces.pop()!;
//         processed.push(originalText);

//         const dividerMarker = pieces.pop()!;
//         processed.push(dividerMarker);
//         if (dividerMarker.trim() !== DIFF_DIVIDER) {
//             throw new Error(`Expected \`${DIFF_DIVIDER}\` not ${dividerMarker.trim()}`);
//         }

//         const updatedText = pieces.pop()!;
//         processed.push(updatedText);

//         const updatedMarker = pieces.pop()!;
//         processed.push(updatedMarker);
//         if (updatedMarker.trim() !== DIFF_CLOSE) {
//             throw new Error(`Expected \`${DIFF_CLOSE}\` not \`${updatedMarker.trim()}\``);
//         }

//         yield { filePath: currentFilename!, search: originalText, replace: updatedText };
//     }
// }

function applySearchReplace(repoState: RepoState, searchReplace: SearchReplace): RepoState {
    const originalContents = (
        repoStates.hasFile(repoState, searchReplace.filePath) ?
            repoStates.getFileContents(repoState, searchReplace.filePath) :
            ""
    );
    if (!originalContents.includes(searchReplace.search)) {
        throw new Error(`Search text ${searchReplace.search} not found in ${searchReplace.filePath}`);
    }
    const updatedContent = originalContents.replace(searchReplace.search, searchReplace.replace);
    return repoStates.upsertFileContents(repoState, searchReplace.filePath, updatedContent);
}