import * as vscode from 'vscode';
import { spawn } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('spectacular.run', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const document = editor.document;
        const fileName = document.fileName;

        const userInput = await vscode.window.showInputBox({
            prompt: 'Enter your Aider command',
            placeHolder: 'e.g., make a script that prints hello'
        });

        if (!userInput) { return; }

        const aiderProcess = spawn('aider', [
            '--message', userInput,
            '--yes',
            '--no-stream',
            fileName
        ]);

        let output = '';
        aiderProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        aiderProcess.stderr.on('data', (data) => {
            console.error(`Aider error: ${data}`);
        });

        aiderProcess.on('close', (code) => {
            if (code === 0) {
                vscode.window.showInformationMessage('Aider command completed successfully');
                // Refresh the file content
                vscode.workspace.openTextDocument(fileName).then(doc => {
                    editor.edit(editBuilder => {
                        const lastLine = doc.lineAt(doc.lineCount - 1);
                        const range = new vscode.Range(new vscode.Position(0, 0), lastLine.range.end);
                        editBuilder.replace(range, doc.getText());
                    });
                });
            } else {
                vscode.window.showErrorMessage(`Aider command failed with code ${code}`);
            }
            console.log(output);
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}