import * as vscode from 'vscode';
import { SpectacularChatViewProvider } from './spectacularChatViewProvider';
import { AiderPanel } from './aider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Spectacular extension is now active!');

    // Register the WebviewViewProvider
    const provider = new SpectacularChatViewProvider(context.extensionUri);
    console.log('Registering SpectacularChatViewProvider...');
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SpectacularChatViewProvider.viewType,
            provider
        )
    );
    console.log('SpectacularChatViewProvider registered successfully.');

    // Register a command to open the Aider panel
    let disposable = vscode.commands.registerCommand('spectacular.openAiderPanel', () => {
        AiderPanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('Spectacular extension is now deactivated!');
}
