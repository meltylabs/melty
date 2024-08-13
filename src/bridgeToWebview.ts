import * as vscode from "vscode";

export class BridgeToWebview {
  private view: vscode.WebviewView;

  constructor(view: vscode.WebviewView) {
    this.view = view;
  }

  public sendNotification(notificationType: string, params: any) {
    console.log(
      `[HelloWorldPanel] sending notification to webview: ${notificationType}`
    );
    this.view.webview.postMessage({
      type: "notification",
      notificationType: notificationType,
      ...params,
    });
  }
}
