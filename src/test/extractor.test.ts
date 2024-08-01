import * as assert from 'assert';
import * as vscode from 'vscode';
import { extractSpecFromCode } from '../extractor';

suite('Spec Extractor', () => {
    test('should extract public API and remove private members', () => {
        const source = `
            interface ToRemain {}
            export class TestClass {
                private toRemove: string;
                public keep() {}
                protected alsoRemove() {}
            }
            export function publicFunction() {}
            function privateFunction() {}
        `;

        const mockDocument = {
            getText: () => source,
            fileName: 'test.ts'
        } as vscode.TextDocument;

        const result = extractSpecFromCode(mockDocument);

        console.log(result);

        assert.ok(result.includes('interface ToRemain'));
        assert.ok(!result.includes('private toRemove'));
        assert.ok(!result.includes('protected alsoRemove'));
        assert.ok(!result.includes('function privateFunction'));

        assert.ok(result.includes('export class TestClass'));
        assert.ok(result.includes('public keep()'));
        assert.ok(result.includes('export function publicFunction'));
        assert.ok(!result.includes('{}'));  // Ensure function bodies are removed
    });
});
