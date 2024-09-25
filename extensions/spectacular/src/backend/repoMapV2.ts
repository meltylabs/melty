import * as fs from "fs";
import * as path from "path";
import { CodebaseView } from "../types";
import { ContextProvider } from "services/ContextProvider";
import { WebviewNotifier } from "services/WebviewNotifier";
import { FileManager } from "services/FileManager";

export class RepoMapV2 {
	constructor(
		private readonly _contextProvider: ContextProvider = ContextProvider.getInstance(),
		private readonly _webviewNotifier: WebviewNotifier = WebviewNotifier.getInstance(),
		private readonly _fileManager: FileManager = FileManager.getInstance()
	) { }

	public async getCodebaseView(): Promise<CodebaseView> {
		this._webviewNotifier.updateStatusMessage("Loading the current state of your codebase");

		const rootDir = this._contextProvider.meltyRootAbsolute;
		let view = "";
		const includedFiles: string[] = [];
		const skippedFiles: string[] = [];
		let allContentsIncluded = true;
		const maxSize = 400000; // ~400k characters, about half of Claude's context window
		const maxFileSize = 100 * 1024; // 100kb

		const fileUris = await this._fileManager.getWorkspaceFiles();
		const fileInfos = fileUris.map(fileUri => ({
			uri: fileUri,
			relPath: path.relative(rootDir, fileUri.fsPath),
			size: 0,
			content: "",
		}));

		// First pass: get file sizes and contents
		for (const fileInfo of fileInfos) {
			if (!fs.existsSync(fileInfo.uri.fsPath)) {
				console.warn("Skipping file that doesn't exist", fileInfo.uri.fsPath);
				continue;
			}

			const stat = fs.statSync(fileInfo.uri.fsPath);
			fileInfo.size = stat.size;

			if (fileInfo.size > maxFileSize) {
				skippedFiles.push(fileInfo.relPath);
				continue;
			}

			fileInfo.content = fs.readFileSync(fileInfo.uri.fsPath, 'utf-8');

			if (this.isBinary(fileInfo.content)) {
				skippedFiles.push(fileInfo.relPath);
				fileInfo.content = "";
			}
		}

		// Calculate total size needed for file names
		const totalFileNameSize = fileInfos.reduce((sum, fileInfo) => sum + fileInfo.relPath.length + 50, 0);

		// Sort files by size (smallest first) to maximize the number of included files
		fileInfos.sort((a, b) => a.size - b.size);

		let remainingSize = maxSize - totalFileNameSize;
		let allFileNamesIncluded = true;

		// Second pass: build the view
		for (const fileInfo of fileInfos) {
			if (fileInfo.content === "") { continue; } // Skip already processed files

			const fileContent = `<file_contents file="${fileInfo.uri}">\n${fileInfo.content}\n</file_contents>\n`;

			if (view.length + fileContent.length <= maxSize && remainingSize > 0) {
				view += fileContent;
				includedFiles.push(fileInfo.relPath);
				remainingSize -= fileContent.length;
			} else if (remainingSize > 0) {
				const skippedFileTag = `<skipped_file file="${fileInfo.relPath}" reason="Not enough space to include full contents" />\n`;
				if (view.length + skippedFileTag.length <= maxSize) {
					view += skippedFileTag;
					skippedFiles.push(fileInfo.relPath);
					remainingSize -= skippedFileTag.length;
					allContentsIncluded = false;
				} else {
					allFileNamesIncluded = false;
					allContentsIncluded = false;
					break;
				}
			} else {
				allFileNamesIncluded = false;
				allContentsIncluded = false;
				break;
			}
		}

		let summary = "";
		if (skippedFiles.length === 0) {
			summary = "This codebase view contains full contents of all files in the codebase, except for binary files and files over 100kb.";
		} else if (allFileNamesIncluded) {
			summary = "This codebase view contains full contents of some files in the codebase. Since there isn't enough space to include full contents of all the files, it lists the names of the remaining files.";
		} else {
			summary = "This codebase view contains the names of some of the files in the codebase. There wasn't enough space to include all the file names.";
		}

		view = `<codebase_view_summary>\n${summary}\n</codebase_view_summary>\n\n${view}`;

		return {
			view,
			allContentsIncluded,
			includedFiles,
			skippedFiles,
		};
	}

	private isBinary(content: string): boolean {
		const sampleSize = Math.min(1024, content.length);
		for (let i = 0; i < sampleSize; i++) {
			if (content.charCodeAt(i) === 0) {
				return true;
			}
		}
		return false;
	}
}
