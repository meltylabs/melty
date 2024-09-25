import * as vscode from "vscode";
import { HelloWorldPanel } from "./HelloWorldPanel";
import posthog from "posthog-js";
import { exec } from 'child_process';

const COPY_MELTY_SETTINGS_SCRIPT_URL = 'https://raw.githubusercontent.com/meltylabs/melty/main/scripts/copy_settings.sh';
const COPY_MELTY_EXTENSIONS_SCRIPT_URL = 'https://raw.githubusercontent.com/meltylabs/melty/main/scripts/copy_extensions.sh';

export class MeltyExtension {
	private outputChannel: vscode.OutputChannel;
	private helloWorldPanel: HelloWorldPanel | null = null;

	constructor(
		private context: vscode.ExtensionContext,
		outputChannel: vscode.OutputChannel,
	) {
		this.outputChannel = outputChannel;
	}

	async activate() {
		this.outputChannel.appendLine("Melty activation started");

		this.helloWorldPanel = new HelloWorldPanel(this.context.extensionUri, this.context);

		this.context.subscriptions.push(
			vscode.window.registerWebviewViewProvider("melty.magicWebview", this.helloWorldPanel)
		);

		this.context.subscriptions.push(
			vscode.commands.registerCommand('melty.copySettings', () => extension.copySettings())
		);

		this.context.subscriptions.push(
			vscode.commands.registerCommand('melty.copyExtensions', () => extension.copyExtensions())
		);

		// posthog init for backend
		posthog.init("phc_tvdsIv2ZDXVeJfYm0GTEBFwaPtdmWRa2cNVGCg18Qt6", {
			api_host: "https://us.i.posthog.com",
			person_profiles: "identified_only",
		});

		outputChannel.appendLine("Melty extension activated");
		console.log("Melty extension activated");
	}

	async deactivate(): Promise<void> {
		await this.helloWorldPanel?.deactivate();
	}

	async copySettings(): Promise<void> {
		// progress bar
		const progress = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		progress.text = 'Copying VS Code settings...';
		progress.show();

		// copy settings
		exec(`curl ${COPY_MELTY_SETTINGS_SCRIPT_URL} - L | bash`, (error, stdout, _stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`Error copying settings: ${error.message} `);
				return;
			}

			// hide progress bar
			progress.hide();

			// show success message
			vscode.window.showInformationMessage('VS Code settings copied successfully!');
			this.outputChannel.appendLine(stdout);
		});
	}

	async copyExtensions(): Promise<void> {
		// progress bar
		const progress = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		progress.text = 'Copying VS Code extensions...';
		progress.show();

		// copy extensions
		exec(`curl ${COPY_MELTY_EXTENSIONS_SCRIPT_URL} -L | bash`, (error, stdout, _stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`Error copying extensions: ${error.message} `);
				return;
			}

			// hide progress bar
			progress.hide();

			// show success message
			vscode.window.showInformationMessage('VS Code extensions copied successfully!');
			this.outputChannel.appendLine(stdout);
		});
	}
}

let outputChannel: vscode.OutputChannel;
let extension: MeltyExtension;

export function activate(context: vscode.ExtensionContext) {
	console.log("Activating Melty extension");
	outputChannel = vscode.window.createOutputChannel("Melty");
	outputChannel.appendLine("Activating Melty extension");

	extension = new MeltyExtension(context, outputChannel);
	extension.activate();

}

export async function deactivate(): Promise<void> {
	await extension.deactivate();
	console.log("Melty extension deactivated");
}
