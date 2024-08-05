import * as fs from 'fs';
import * as path from 'path';
import Parser from 'node-tree-sitter';
import treeSitterTypeScript from 'tree-sitter-wasms/out/tree-sitter-typescript.wasm';
// // @ts-ignore
// import TypeScript from 'tree-sitter-typescript';

interface Tag {
    relFname: string;
    fname: string;
    name: string;
    kind: 'def' | 'ref';
    line: number;
}

export class RepoMap {
    private parsers: Map<string, Parser>;

    constructor(private options: { root: string }) {
        this.parsers = new Map();
        this.initParsers();
    }

    private initParsers() {
        const tsParser = new Parser();
        tsParser.setLanguage(treeSitterTypeScript);
        this.parsers.set('.ts', tsParser);
    }

    private getParser(fileName: string): Parser | undefined {
        const ext = path.extname(fileName);
        return this.parsers.get(ext);
    }

    public getRepoMap(chatFiles: string[], otherFiles: string[]): string {
        const allFiles = [...new Set([...chatFiles, ...otherFiles])];
        const tags = this.getAllTags(allFiles);
        const rankedTags = this.rankTags(tags);
        return this.generateMapString(rankedTags);
    }

    private getAllTags(files: string[]): Tag[] {
        let allTags: Tag[] = [];
        for (const file of files) {
            const parser = this.getParser(file);
            if (parser) {
                const content = fs.readFileSync(file, 'utf-8');
                const tree = parser.parse(content);
                const tags = this.extractTags(file, tree);
                allTags = allTags.concat(tags);
            }
        }
        return allTags;
    }

    private extractTags(fileName: string, tree: Parser.Tree): Tag[] {
        const tags: Tag[] = [];
        const cursor = tree.walk();

        const visit = () => {
            const node = cursor.currentNode;
            if (this.isDefinition(node)) {
                tags.push(this.createTag(fileName, node, 'def'));
            } else if (this.isReference(node)) {
                tags.push(this.createTag(fileName, node, 'ref'));
            }

            if (cursor.gotoFirstChild()) {
                do {
                    visit();
                } while (cursor.gotoNextSibling());
                cursor.gotoParent();
            }
        };

        visit();
        return tags;
    }
    private isDefinition(node: Parser.SyntaxNode): boolean {
        const definitionTypes = [
            'function_declaration',
            'method_definition',
            'class_declaration',
            'interface_declaration',
            'type_alias_declaration',
            'variable_declaration'
        ];
        return definitionTypes.includes(node.type);
    }

    private isReference(node: Parser.SyntaxNode): boolean {
        return node.type === 'identifier' && node.parent?.type !== 'property_identifier';
    }

    private createTag(fileName: string, node: Parser.SyntaxNode, kind: 'def' | 'ref'): Tag {
        return {
            relFname: path.relative(this.options.root, fileName),
            fname: fileName,
            name: node.text,
            kind: kind,
            line: node.startPosition.row + 1
        };
    }

    private rankTags(tags: Tag[]): Tag[] {
        const graph: { [key: string]: Set<string> } = {};
        let ranks: { [key: string]: number } = {};

        // Build the graph
        tags.forEach(tag => {
            if (tag.kind === 'def') {
                if (!graph[tag.name]) {
                    graph[tag.name] = new Set();
                }
                ranks[tag.name] = 1; // Initial rank
            } else if (tag.kind === 'ref') {
                if (!graph[tag.name]) {
                    graph[tag.name] = new Set();
                }
                graph[tag.name].add(tag.relFname);
            }
        });

        // Simplified PageRank
        const damping = 0.85;
        const iterations = 10;

        for (let i = 0; i < iterations; i++) {
            const newRanks: { [key: string]: number } = {};
            Object.keys(graph).forEach(node => {
                let sum = 0;
                Object.keys(graph).forEach(otherNode => {
                    if (graph[otherNode].has(node)) {
                        sum += ranks[otherNode] / graph[otherNode].size;
                    }
                });
                newRanks[node] = (1 - damping) + damping * sum;
            });
            ranks = newRanks;
        }

        // Sort tags based on rank
        return tags.sort((a, b) => (ranks[b.name] || 0) - (ranks[a.name] || 0));
    }


    private generateMapString(tags: Tag[]): string {
        let currentFile = '';
        let output = '';

        tags.forEach(tag => {
            if (tag.relFname !== currentFile) {
                if (currentFile !== '') {
                    output += '\n';
                }
                output += `${tag.relFname}:\n`;
                currentFile = tag.relFname;
            }

            const indent = '│';
            const name = tag.name.length > 30 ? tag.name.substring(0, 27) + '...' : tag.name;
            output += `${indent}${tag.kind === 'def' ? name : `(ref) ${name}`} (line ${tag.line})\n`;
        });

        return output;
    }
}
