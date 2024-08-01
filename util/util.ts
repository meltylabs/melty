import * as vscode from 'vscode';
import * as path from 'path';

export class Util {
    static makeWorkspaceEditRelativeToContextRoot(edit: vscode.WorkspaceEdit, contextRoot: string): vscode.WorkspaceEdit {
        const relativeEdit = new vscode.WorkspaceEdit();
        for (const [uri, edits] of edit.entries()) {
            const relativePath = path.relative(contextRoot, uri.fsPath);
            const relativeUri = vscode.Uri.file(relativePath);
            relativeEdit.set(relativeUri, edits);
        }
        return relativeEdit;
    }

    // static makeWorkspaceEditAbsolute(edit: vscode.WorkspaceEdit, contextRoot: string): vscode.WorkspaceEdit {
    //     // TODO new files are getting dropped here because they're not represented in .entries(). ugh.
    //     const absoluteEdit = new vscode.WorkspaceEdit();
    //     for (const [uri, edits] of edit.entries()) {
    //         const relativePath = uri.fsPath.startsWith('/') ? uri.fsPath.slice(1) : uri.fsPath;
    //         const absolutePath = path.resolve(contextRoot, relativePath);
    //         const absoluteUri = vscode.Uri.file(absolutePath);
    //         absoluteEdit.set(absoluteUri, edits);
    //     }
    //     return absoluteEdit;
    // }

    static makeUriRelativetoContextRoot(uri: vscode.Uri, contextRoot: string): vscode.Uri {
        return vscode.Uri.file(uri.fsPath.replace(contextRoot, ''));
    }

    static makeUriAbsolute(uri: vscode.Uri, contextRoot: string): vscode.Uri {
        const relativePath = uri.fsPath.startsWith('/') ? uri.fsPath.slice(1) : uri.fsPath;
        return vscode.Uri.file(path.join(contextRoot, relativePath));
    }
}
