import * as vscode from 'vscode';
import { SpectacularChatViewProvider } from './spectacularChatViewProvider';

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
    console.log('Registering command to show SpectacularChatView...');
    context.subscriptions.push(
        vscode.commands.registerCommand('spectacular.showChat', () => {
            console.log('Executing command to show SpectacularChatView...');
            vscode.commands.executeCommand('workbench.view.extension.spectacularChat')
                .then(
                    () => console.log('Command executed successfully.'),
                    (err) => console.error('Command execution failed:', err)
                );
        })
    );
    console.log('Command to show SpectacularChatView registered successfully.');
}

export function deactivate() {
    console.log('Spectacular extension is now deactivated!');
}
