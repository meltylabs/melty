import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import { GitRepo } from '../types';

export class RepoMapSpec {
    private gitRepo: GitRepo;

    constructor(gitRepo: GitRepo) {
        this.gitRepo = gitRepo;
    }

    public async getRepoMap(workspaceFilenames: string[]): Promise<string> {
        let fullMap = "";
        for (const file of workspaceFilenames) {
            fullMap += this.mapFile(file);
        }
        return fullMap;
    }

    private mapFile(filename: string): string {
        console.log("extracting spec");
        const sourceFile = ts.createSourceFile(
            filename,
            fs.readFileSync(path.join(this.gitRepo.rootPath, filename), 'utf-8'),
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

        function visitClassDeclaration(node: ts.ClassDeclaration): ts.ClassDeclaration {
            const members = node.members
                .map(member => visit(member))
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

        function visitFunctionLike(node: ts.FunctionLikeDeclaration): ts.FunctionLikeDeclaration | undefined {
            // Remove non-exported functions at the top level
            if (ts.isFunctionDeclaration(node) && !node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                return undefined;
            }

            if (ts.isMethodDeclaration(node) && node.modifiers?.some(m =>
                m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword
            )) {
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

        function visitPropertyDeclaration(node: ts.PropertyDeclaration): ts.PropertyDeclaration | undefined {
            if (node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword)) {
                return undefined;
            }
            return node;
        }

        // Transform the source
        console.log("transforming " + filename);

        const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
            return (sourceFile) => {
                function visitor(node: ts.Node): ts.Node | undefined {
                    return visit(node);
                    // return ts.visitEachChild(node, visitor, context);
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
            throw new Error('Failed to transform source file');
        }
        return printer.printFile(transformedSourceFile);
    }
}

