import * as fs from "fs";
import * as path from "path";
import { CodebaseView } from "../types";
import { ContextProvider } from "services/ContextProvider";
import { WebviewNotifier } from "services/WebviewNotifier";
import { FileManager } from "services/FileManager";
import * as vscode from "vscode";

export type FileInfo = {
	uri: vscode.Uri;
	relPath: string;
	size: number;
	content: string;
	skipReason: string | null;
};

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
		const maxSize = 400000; // ~400k characters, about half of Claude's context window
		const maxFileSize = 100 * 1024; // 100kb

		const fileUris = await this._fileManager.getWorkspaceFiles();
		const fileInfos = await this.processFiles(fileUris, rootDir, maxFileSize);

		// Sort files by size (smallest first) to maximize the number of included files
		fileInfos.sort((a, b) => a.size - b.size);

		let remainingSize = maxSize;
		let allFileNamesIncluded = true;
		let allContentsIncluded = true;

		// First pass: Include all file names
		for (const fileInfo of fileInfos) {
			const nameTag = this.createFileNameTag(fileInfo);
			if (view.length + nameTag.length <= maxSize) {
				view += nameTag;
				remainingSize -= nameTag.length;
			} else {
				allFileNamesIncluded = false;
				break;
			}
		}

		// Second pass: Include file contents where possible
		for (const fileInfo of fileInfos) {
			if (fileInfo.skipReason) {
				skippedFiles.push(fileInfo.relPath);
				continue;
			}

			const contentTag = this.createFileContentTag(fileInfo);
			if (view.length + contentTag.length <= maxSize && remainingSize >= contentTag.length) {
				view += contentTag;
				includedFiles.push(fileInfo.relPath);
				remainingSize -= contentTag.length;
			} else {
				skippedFiles.push(fileInfo.relPath);
				allContentsIncluded = false;
				const skippedTag = `<skipped_file file="${fileInfo.relPath}" reason="Not enough space to include full contents" />\n`;
				if (view.length + skippedTag.length <= maxSize) {
					view += skippedTag;
					remainingSize -= skippedTag.length;
				}
			}
		}

		const summary = this.generateSummary(skippedFiles.length, allFileNamesIncluded, allContentsIncluded);
		view = `<codebase_view_summary>\n${summary}\n</codebase_view_summary>\n\n${view}`;

		return {
			view,
			allContentsIncluded,
			includedFiles,
			skippedFiles,
		};
	}

	private createFileNameTag(fileInfo: FileInfo): string {
		if (fileInfo.skipReason) {
			return `<skipped_file file="${fileInfo.relPath}" reason="${fileInfo.skipReason}" />\n`;
		}
		return `<file_name file="${fileInfo.relPath}" />\n`;
	}

	private createFileContentTag(fileInfo: FileInfo): string {
		return `<file_contents file="${fileInfo.uri}">\n${fileInfo.content}\n</file_contents>\n`;
	}

	private generateSummary(skippedFilesCount: number, allFileNamesIncluded: boolean, allContentsIncluded: boolean): string {
		if (skippedFilesCount === 0) {
			return "This codebase view contains full contents of all files in the codebase, except for binary files and files over 100kb.";
		} else if (allFileNamesIncluded) {
			if (allContentsIncluded) {
				return "This codebase view contains full contents of all files that could be included, and lists the names of files that were skipped due to being binary or too large.";
			} else {
				return "This codebase view contains full contents of some files in the codebase. Since there isn't enough space to include full contents of all the files, it lists the names of the remaining files.";
			}
		} else {
			return "This codebase view contains the names of some of the files in the codebase. There wasn't enough space to include all the file names or contents.";
		}
	}

	private async processFiles(fileUris: vscode.Uri[], rootDir: string, maxFileSize: number): Promise<FileInfo[]> {
		return Promise.all(fileUris.map(async fileUri => {
			const fileInfo: FileInfo = {
				uri: fileUri,
				relPath: path.relative(rootDir, fileUri.fsPath),
				size: 0,
				content: "",
				skipReason: null
			};

			if (!fs.existsSync(fileInfo.uri.fsPath)) {
				console.warn("Skipping file that doesn't exist", fileInfo.uri.fsPath);
				fileInfo.skipReason = "File does not exist";
				return fileInfo;
			}

			const stat = fs.statSync(fileInfo.uri.fsPath);
			fileInfo.size = stat.size;

			if (fileInfo.size > maxFileSize) {
				fileInfo.skipReason = "File is too big";
				return fileInfo;
			}

			fileInfo.content = fs.readFileSync(fileInfo.uri.fsPath, 'utf-8');

			if (this.isBinary(fileInfo.content)) {
				fileInfo.content = "";
				fileInfo.skipReason = "Binary file";
			}

			return fileInfo;
		}));
	}

	private createFileTag(fileInfo: FileInfo, remainingSize: number): string {
		if (fileInfo.skipReason) {
			return `<skipped_file file="${fileInfo.relPath}" reason="${fileInfo.skipReason}" />\n`;
		} else if (fileInfo.content.length > remainingSize) {
			return `<skipped_file file="${fileInfo.relPath}" reason="Not enough space to include full contents" />\n`;
		} else {
			return `<file_contents file="${fileInfo.uri}">\n${fileInfo.content}\n</file_contents>\n`;
		}
	}

	private generateSummary(skippedFilesCount: number, allFileNamesIncluded: boolean): string {
		if (skippedFilesCount === 0) {
			return "This codebase view contains full contents of all files in the codebase, except for binary files and files over 100kb.";
		} else if (allFileNamesIncluded) {
			return "This codebase view contains full contents of some files in the codebase. Since there isn't enough space to include full contents of all the files, it lists the names of the remaining files.";
		} else {
			return "This codebase view contains the names of some of the files in the codebase. There wasn't enough space to include all the file names.";
		}
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
