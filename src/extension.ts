import * as vscode from 'vscode';
import { SpectacularChatViewProvider } from './spectacularChatViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Spectacular extension is now active!');
	// Register the WebviewViewProvider
	const provider = new SpectacularChatViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SpectacularChatViewProvider.viewType,
			provider
		)
	);
}

export function deactivate() { }                                                                                                                                                          
