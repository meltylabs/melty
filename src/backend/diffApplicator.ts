import { RepoState } from './repoStates';
import * as repoStates from './repoStates';

const CODE_FENCE = ["```", "```"];
const DIFF_OPEN = "<<<<<<< SEARCH";
const DIFF_DIVIDER = "=======";
const DIFF_CLOSE = ">>>>>>> REPLACE";
const DIFF_PIECES = [DIFF_OPEN, DIFF_DIVIDER, DIFF_CLOSE];

export type SearchReplace = {
    filePath: string;
    search: string;
    replace: string;
};

export const testExports = {
    stripFilename,
    findFilename,
    findSearchReplaceBlocks,
    applySearchReplace,
};

export function applyDiffs(repoState: RepoState, response: string): RepoState {
    const searchReplaces = findSearchReplaceBlocks(response);
    return searchReplaces.reduce((repoState, searchReplace) => {
        return applySearchReplace(repoState, searchReplace);
    }, repoState);
}

function stripFilename(filename: string): string | undefined {
    filename = filename.trim();

    if (filename === "...") {
        return undefined;
    }

    const startFence = CODE_FENCE[0];
    if (filename.startsWith(startFence)) {
        return undefined;
    }

    filename = filename.replace(/:$/, "");
    filename = filename.replace(/^#/, "");
    filename = filename.trim();
    filename = filename.replace(/^`|`$/g, "");
    filename = filename.replace(/^\*|\*$/g, "");
    filename = filename.replace(/\\_/g, "_");

    return filename;
}


function findFilename(lines: string[]): string | undefined {
    for (const line of lines.reverse()) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("```") && !trimmedLine.includes(DIFF_OPEN)) {
            return stripFilename(trimmedLine);
        }
    }
    return undefined;
}


// function ensurePiece(piece: string, expected: (piece: string) => boolean, state: string) {
//     if (!expected(piece)) {
//         throw new Error(`Unexpected piece: ${piece} in state ${state}`);
//     }
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

// export for testing only -- PRIVATE
export function* generateSearchReplaceBlocks(content: string, fence: string[] = ["```", "```"]): Generator<SearchReplace> {
    const separators = DIFF_PIECES.join("|");
    const splitRegex = new RegExp(`^((?:${separators})[ ]*\n)`, "gm");

    const missingFilenameErr = "Bad/missing filename. The filename must be alone on the line before the opening fence ```";

    if (!content.endsWith("\n")) {
        content += "\n";
    }

    const pieces = content.split(splitRegex);
    pieces.reverse();
    const processed: string[] = [];

    let currentFilename: string | undefined;

    while (pieces.length) {
        const cur = pieces.pop()!;

        if (cur === DIFF_DIVIDER || cur === DIFF_CLOSE) {
            processed.push(cur);
            throw new Error(`Unexpected ${cur}`);
        }

        if (cur.trim() !== DIFF_OPEN) {
            processed.push(cur);
            continue;
        }

        const preSearchChunk = processed[processed.length - 1];
        processed.push(cur); // original_marker

        let filename = (() => {
            const linesToSearch = preSearchChunk.split("\n").slice(-3);
            const explicitFilename = findFilename(linesToSearch);
            if (explicitFilename) { return explicitFilename; }
            if (currentFilename) { return currentFilename; }
            throw new Error(missingFilenameErr);
        })();

        // update for next go-around
        currentFilename = filename;

        if (pieces.length < 4) {
            throw new Error("Incomplete SEARCH/REPLACE block.");
        }

        const originalText = pieces.pop()!;
        processed.push(originalText);

        const dividerMarker = pieces.pop()!;
        processed.push(dividerMarker);
        if (dividerMarker.trim() !== DIFF_DIVIDER) {
            throw new Error(`Expected \`${DIFF_DIVIDER}\` not ${dividerMarker.trim()}`);
        }

        const updatedText = pieces.pop()!;
        processed.push(updatedText);

        const updatedMarker = pieces.pop()!;
        processed.push(updatedMarker);
        if (updatedMarker.trim() !== DIFF_CLOSE) {
            throw new Error(`Expected \`${DIFF_CLOSE}\` not \`${updatedMarker.trim()}\``);
        }

        yield { filePath: currentFilename!, search: originalText, replace: updatedText };
    }
}

function findSearchReplaceBlocks(content: string): SearchReplace[] {
    return Array.from(generateSearchReplaceBlocks(content));
}

function applySearchReplace(repoState: RepoState, searchReplace: SearchReplace): RepoState {
    const originalContents = (
        repoStates.hasFile(repoState, searchReplace.filePath) ?
        repoStates.getFileContents(repoState, searchReplace.filePath) :
        ""
    );
    if (!originalContents.includes(searchReplace.search)) {
        throw new Error(`Search text not found in ${searchReplace.filePath}`);
    }
    const updatedContent = originalContents.replace(searchReplace.search, searchReplace.replace);
    return repoStates.upsertFileContents(repoState, searchReplace.filePath, updatedContent);
}