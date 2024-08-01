import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { Util } from '../util/util';

suite('Util Tests', () => {
    const contextRoot = '/Users/jacksondc/Development/spectacle/example_project';

    test('makeRelativeTocontextRoot', () => {
        const edit = new vscode.WorkspaceEdit();
        edit.insert(vscode.Uri.file(`${contextRoot}/cat.foo`), new vscode.Position(0, 0), 'test');

        const relativeEdit = Util.makeWorkspaceEditRelativeToContextRoot(edit, contextRoot);
        const [[uri, edits]] = relativeEdit.entries();

        assert.strictEqual(uri.fsPath, '/cat.foo');
        assert.strictEqual(edits[0].newText, 'test');
    });

    // test('makeAbsoluteToFileSystemRoot', () => {
    //     const edit = new vscode.WorkspaceEdit();
    //     edit.insert(vscode.Uri.file('cat.foo'), new vscode.Position(0, 0), 'test');

    //     const absoluteEdit = Util.makeWorkspaceEditAbsolute(edit, contextRoot);
    //     const [[uri, edits]] = absoluteEdit.entries();

    //     assert.strictEqual(uri.fsPath, path.join(contextRoot, 'cat.foo'));
    //     assert.strictEqual(edits[0].newText, 'test');
    // });

    // test('makeAbsoluteToFileSystemRoot with leading slash', () => {
    //     const edit = new vscode.WorkspaceEdit();
    //     edit.insert(vscode.Uri.file('/cat.foo'), new vscode.Position(0, 0), 'test');

    //     const absoluteEdit = Util.makeWorkspaceEditAbsolute(edit, contextRoot);
    //     const [[uri, edits]] = absoluteEdit.entries();

    //     assert.strictEqual(uri.fsPath, path.join(contextRoot, 'cat.foo'));
    //     assert.strictEqual(edits[0].newText, 'test');
    // });

    test('makeUriAbsolute', () => {
        const uri = Util.makeUriAbsolute(vscode.Uri.file('cat.foo'), '/foo/bar/baz');
        assert.strictEqual(uri.fsPath, '/foo/bar/baz/cat.foo');
    });
});
