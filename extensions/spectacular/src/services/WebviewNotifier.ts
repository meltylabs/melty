import * as vscode from "vscode";

export class WebviewNotifier {
	// TODO ensure that notifications are delivered in order

	private static instance: WebviewNotifier | null = null;
	private view: vscode.WebviewView | null = null;

	private constructor() { }

	public static getInstance(): WebviewNotifier {
		if (!WebviewNotifier.instance) {
			WebviewNotifier.instance = new WebviewNotifier();
		}
		return WebviewNotifier.instance;
	}

	public setView(view: vscode.WebviewView) {
		this.view = view;
	}

	public async updateStatusMessage(statusMessage: string): Promise<boolean> {
		return await this.sendNotification("updateStatusMessage", {
			statusMessage: statusMessage,
		});
	}

	public async resetStatusMessage(): Promise<boolean> {
		return await this.sendNotification("updateStatusMessage", {
			statusMessage: "Spinning the wheels",
		});
	}

	public async sendNotification(
		notificationType: string,
		params: any
	): Promise<boolean> {
		if (!this.view) {
			throw new Error("Illegal state: webview used before initialization");
		}
		console.log(
			`[HelloWorldPanel] sending notification to webview: ${notificationType}`
		);
		return await this.view.webview.postMessage({
			type: "notification",
			notificationType: notificationType,
			...params,
		});
	}
}
