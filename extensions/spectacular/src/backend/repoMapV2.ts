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
		let isComplete = true;
		const maxSize = 400000; // ~400k characters, about half of Claude's context window

		const processDirectory = (dir: string) => {
			const files = fs.readdirSync(dir);
			for (const file of files) {
				const filePath = path.join(dir, file);
				const stat = fs.statSync(filePath);

				if (stat.isDirectory()) {
					processDirectory(filePath);
				} else if (stat.isFile()) {
					const content = fs.readFileSync(filePath, 'utf-8');

					if (this.isBinary(content)) {
						skippedFiles.push(filePath);
						continue;
					}

					const fileContent = `<file_contents file="${filePath}">\n${content}\n</file_contents>\n`;

					if (view.length + fileContent.length > maxSize) {
						skippedFiles.push(filePath);
						isComplete = false;
						continue;
					}

					view += fileContent;
					includedFiles.push(filePath);
				}
			}
		};

		processDirectory(rootDir);

		return {
			view,
			isComplete,
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
