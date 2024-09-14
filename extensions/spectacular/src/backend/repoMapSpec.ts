import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import { GitManager } from "services/GitManager";

export class RepoMapSpec {
	constructor(
		private readonly _gitManager: GitManager = GitManager.getInstance()
	) { }

	public async getRepoMap(relativeFilePaths: string[]): Promise<string> {
		// if the repo is too big, disable repoMap entirely
		if (relativeFilePaths.length > 250) {
			console.log(
				`Repo is too large to summarize (${relativeFilePaths.length} files). Disabling summary.`
			);
			return "[Repo is too large to summarize]";
		}

		console.log("building repomap");
		// Filter out files that don't exist and files that are >100kb
		const eligibleFiles = relativeFilePaths.filter((file) => {
			const absPath = path.join(this._gitManager.getMeltyRoot(), file);
			return fs.existsSync(absPath) && fs.statSync(absPath).size < 100000;
		});

		let fullMap = "";
		for (const file of eligibleFiles) {
			fullMap += `<file_summary file="${file}">\n`;
			fullMap += this.mapFile(file);
			fullMap += `</file_summary>\n`;
		}

		console.log("repo map complete");
		return fullMap;
	}

	private mapFile(relativeFilePath: string): string {
		if (path.basename(relativeFilePath) === "package.json") {
			const absoluteFilePath = path.join(
				this._gitManager.getMeltyRoot(),
				relativeFilePath
			);
			return fs.readFileSync(absoluteFilePath, "utf-8");
		}

		const supportedExtensions = [".ts", ".tsx", ".js", ".jsx", ".json"];

		if (!supportedExtensions.includes(path.extname(relativeFilePath))) {
			return ""; // don't print an explanation because it's too many tokens
		}
		const spec = this.extractSpec(relativeFilePath);

		const lines = spec.split("\n");
		// split lines into chunks that belong to the same non-block comment (//)
		const filteredLines = [];
		let commentChunk = [];

		for (const line of lines) {
			if (!line.startsWith("//")) {
				// possibly push comment chunk
				if (commentChunk.length > 0) {
					// evaluate
					const keepThisChunk = commentChunk.length < 15;
					if (keepThisChunk) {
						filteredLines.push(commentChunk.join("\n"));
					}
					// reset
					commentChunk = [];
				}

				filteredLines.push(line);
			} else {
				commentChunk.push(line);
			}
		}

		// now, truncate to 50 lines
		const quotedLines = filteredLines.map((line) => `| ${line}`);
		const truncatedLines =
			quotedLines.length < 50
				? quotedLines
				: quotedLines.slice(0, 50).concat(["[TRUNCATED]"]);
		return truncatedLines.join("\n");
	}

	private extractSpec(relativeFilePath: string): string {
		const absoluteFilePath = path.join(this._gitManager.getMeltyRoot(), relativeFilePath);
		const sourceFile = ts.createSourceFile(
			absoluteFilePath,
			fs.readFileSync(absoluteFilePath, "utf-8"),
			ts.ScriptTarget.Latest,
			true
		);

		const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

		function visit(node: ts.Node): ts.Node | undefined {
			switch (node.kind) {
				case ts.SyntaxKind.ClassDeclaration:
					return visitClassDeclaration(node as ts.ClassDeclaration);
				case ts.SyntaxKind.MethodDeclaration:
				case ts.SyntaxKind.FunctionDeclaration:
					return visitFunctionLike(node as ts.FunctionLikeDeclaration);
				case ts.SyntaxKind.PropertyDeclaration:
					return visitPropertyDeclaration(node as ts.PropertyDeclaration);
				case ts.SyntaxKind.InterfaceDeclaration:
					return node; // Keep interfaces as-is
			}
			return ts.isSourceFile(node) ? node : undefined;
		}

		function visitClassDeclaration(
			node: ts.ClassDeclaration
		): ts.ClassDeclaration {
			const members = node.members
				.map((member) => visit(member))
				.filter((member): member is ts.ClassElement => member !== undefined);
			return ts.factory.updateClassDeclaration(
				node,
				node.modifiers,
				node.name,
				node.typeParameters,
				node.heritageClauses,
				members
			);
		}

		function visitFunctionLike(
			node: ts.FunctionLikeDeclaration
		): ts.FunctionLikeDeclaration | undefined {
			// Remove non-exported functions at the top level
			if (
				ts.isFunctionDeclaration(node) &&
				!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
			) {
				return undefined;
			}

			if (
				ts.isMethodDeclaration(node) &&
				node.modifiers?.some(
					(m) =>
						m.kind === ts.SyntaxKind.PrivateKeyword ||
						m.kind === ts.SyntaxKind.ProtectedKeyword
				)
			) {
				return undefined;
			}

			if (node.name && ts.isPrivateIdentifier(node.name)) {
				return undefined;
			}
			if (ts.isMethodDeclaration(node)) {
				return ts.factory.updateMethodDeclaration(
					node,
					node.modifiers,
					node.asteriskToken,
					node.name,
					node.questionToken,
					node.typeParameters,
					node.parameters,
					node.type,
					undefined // Remove the method body
				);
			} else if (ts.isFunctionDeclaration(node)) {
				return ts.factory.updateFunctionDeclaration(
					node,
					node.modifiers,
					node.asteriskToken,
					node.name,
					node.typeParameters,
					node.parameters,
					node.type,
					undefined // Remove the function body
				);
			}
			return node;
		}

		function visitPropertyDeclaration(
			node: ts.PropertyDeclaration
		): ts.PropertyDeclaration | undefined {
			if (
				node.modifiers?.some(
					(modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword
				)
			) {
				return undefined;
			}
			return node;
		}

		const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
			return (sourceFile) => {
				function visitor(node: ts.Node): ts.Node | undefined {
					return visit(node);
				}
				return ts.visitEachChild(sourceFile, visitor, context);
			};
		};
		const result = ts.transform(sourceFile, [transformer]);

		// Create a new SourceFile from the transformed nodes
		const transformedSourceFile = ts.factory.updateSourceFile(
			sourceFile,
			result.transformed[0].statements,
			sourceFile.isDeclarationFile,
			sourceFile.referencedFiles,
			sourceFile.typeReferenceDirectives,
			sourceFile.hasNoDefaultLib,
			sourceFile.libReferenceDirectives
		);

		if (!transformedSourceFile || !ts.isSourceFile(transformedSourceFile)) {
			throw new Error("Failed to transform source file");
		}
		return printer.printFile(transformedSourceFile);
	}
}
