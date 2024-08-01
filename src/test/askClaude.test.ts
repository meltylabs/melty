import * as sinon from 'sinon';
import * as assert from 'assert';
import * as vscode from 'vscode';
import { TextDocument } from 'vscode';
import { MessageEvent } from '../tasks/task';
import { askClaude, PromptFormatter, ClaudeResponse } from '../tasks/askClaude';
import * as claudeAPI from '../tasks/claudeAPI';

function createMockTextDocument(uri: string, content: string): vscode.TextDocument {
    return {
        uri: vscode.Uri.file(uri),
        fileName: uri,
        isUntitled: false,
        languageId: 'typescript',
        version: 1,
        isDirty: false,
        isClosed: false,
        save: () => Promise.resolve(true),
        eol: vscode.EndOfLine.LF,
        lineCount: content.split('\n').length,
        lineAt: (lineOrPosition: number | vscode.Position) => {
            const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
            const lines = content.split('\n');
            return {
                lineNumber: line,
                text: lines[line],
                range: new vscode.Range(line, 0, line, lines[line].length),
                rangeIncludingLineBreak: new vscode.Range(line, 0, line, lines[line].length + 1),
                firstNonWhitespaceCharacterIndex: lines[line].search(/\S/),
                isEmptyOrWhitespace: lines[line].trim().length === 0
            };
        },
        offsetAt: () => 0,
        positionAt: () => new vscode.Position(0, 0),
        getText: () => content,
        getWordRangeAtPosition: () => undefined,
        validateRange: (r) => r,
        validatePosition: (p) => p,
    };
}

suite('askClaude Tests', () => {
    let sendToClaudeAPIStub: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        sendToClaudeAPIStub = sandbox.stub(claudeAPI, 'sendToClaudeAPI');
    });

    teardown(() => {
        sandbox.restore();
    });

    // test('askClaude should return correct ClaudeResponse', async () => {
    //     const mockClaudeResponse = `
    //         <Response>
    //             <Message>Updated the files as requested.</Message>
    //             <RevisedFiles>
    //                 <File>
    //                     <Path>/file1.ts</Path>
    //                     <Content>const y = 10;\nconsole.log("Hello");</Content>
    //                 </File>
    //                 <File>
    //                     <Path>/folder/file2.ts</Path>
    //                     <Content>const x = 5;\nconst z = 15;</Content>
    //                 </File>
    //             </RevisedFiles>
    //         </Response>
    //     `;

    //     sendToClaudeAPIStub.resolves(mockClaudeResponse);

    //     const result = await askClaude('Test prompt', '/');

    //     assert.strictEqual(result.message, 'Updated the files as requested.');
    //     assert.strictEqual(result.workspaceEdit.size, 2);
        
    //     const file1Edit = result.workspaceEdit.get(vscode.Uri.file('/file1.ts'));
    //     assert.strictEqual(file1Edit[0].newText, 'const y = 10;\nconsole.log("Hello");');
        
    //     const file2Edit = result.workspaceEdit.get(vscode.Uri.file('/folder/file2.ts'));
    //     assert.strictEqual(file2Edit[0].newText, 'const x = 5;\nconst z = 15;');
    // });

    test('PromptFormatter.formatTextDocuments should format workspace correctly', () => {
        const mockContextRoot = '/mock/workspace';
        const workspaceTextDocuments = [
            createMockTextDocument('/mock/workspace/file1.ts', 'const x = 5;\nconst z = 15;')
        ];

        const result = PromptFormatter.formatTextDocuments(workspaceTextDocuments, mockContextRoot);

        assert.ok(result.includes('<Workspace>'));
        assert.ok(result.includes('<Path>/file1.ts</Path>'));
        assert.ok(result.includes('<Content>const x = 5;\nconst z = 15;</Content>'));
        assert.ok(result.includes('</Workspace>'));
    });

    test('PromptFormatter.formatMessage should format message correctly', () => {
        const message = 'Test message';
        const result = PromptFormatter.formatMessage(message);

        assert.strictEqual(result, '<Message>Test message</Message>');
    });

    test('PromptFormatter.formatEdits should format edits correctly', () => {
        const mockContextRoot = '/mock/workspace';
        const workspaceTextDocuments = [
            createMockTextDocument('/mock/workspace/file3.ts', 'Original content')
        ];
        const editsInCurrentTask = new vscode.WorkspaceEdit();
        editsInCurrentTask.insert(vscode.Uri.file('/mock/workspace/file3.ts'), new vscode.Position(0, 0), 'I edited this\n');

        const result = PromptFormatter.formatEdits(editsInCurrentTask, workspaceTextDocuments, mockContextRoot);

        assert.ok(result.includes('<EditsInCurrentTask>'));
        assert.ok(result.includes('<Path>/file3.ts</Path>'));
        assert.ok(result.includes('<OldText>Original content</OldText>'));
        assert.ok(result.includes('<NewText>I edited this\n</NewText>'));
        assert.ok(result.includes('</EditsInCurrentTask>'));
    });

    test('PromptFormatter.formatMessageHistory should format message history correctly', () => {
        const messages: MessageEvent[] = [
            { author: 'user', text: 'Please add a constant y.', timestamp: new Date(2023, 0, 1).getTime(), id: '1' }
        ];

        const result = PromptFormatter.formatMessageHistory(messages);

        assert.ok(result.includes('<MessageHistory>'));
        assert.ok(result.includes('<Author>user</Author>'));
        assert.ok(result.includes('<Text>Please add a constant y.</Text>'));
        assert.ok(result.includes('</MessageHistory>'));
    });

    test('should build correct full prompt for Claude', () => {
        const mockContextRoot = '/mock/workspace';
        const workspaceTextDocuments = [
            createMockTextDocument('/mock/workspace/file1.ts', 'const x = 5;\nconst z = 15;')
        ];
        const editsInCurrentTask = new vscode.WorkspaceEdit();
        editsInCurrentTask.insert(vscode.Uri.file('/mock/workspace/file3.ts'), new vscode.Position(0, 0), 'I edited this\n');
        const messages: MessageEvent[] = [
            { author: 'user', text: 'Please add a constant y.', timestamp: new Date(2023, 0, 1).getTime(), id: '1' }
        ];

        const historyPrompt = PromptFormatter.formatMessageHistory(messages);
        const workspacePrompt = PromptFormatter.formatTextDocuments(workspaceTextDocuments, mockContextRoot);
        const editsPrompt = PromptFormatter.formatEdits(editsInCurrentTask, workspaceTextDocuments, mockContextRoot);
        const messagePrompt = PromptFormatter.formatMessage("User's message");

        const fullPrompt = `
${historyPrompt}
${workspacePrompt}
${editsPrompt}
${messagePrompt}
`;

        assert.ok(fullPrompt.includes('<MessageHistory>'));
        assert.ok(fullPrompt.includes('<Workspace>'));
        assert.ok(fullPrompt.includes('<EditsInCurrentTask>'));
        console.log(fullPrompt);
        assert.ok(fullPrompt.includes('<Message>User&apos;s message</Message>'));
    });
});
