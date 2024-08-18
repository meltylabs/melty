import { vscode } from "./utilities/vscode";
import { RpcMethod } from "./types";

export class RpcClient {
  private messageId = 0;
  private pendingMessages = new Map<
    number,
    { resolve: (value: any) => void; reject: (reason?: any) => void }
  >();

  constructor() {
    // Bind the method to ensure 'this' always refers to the class instance
    this.handleMessage = this.handleMessage.bind(this);
  }

  public run(method: RpcMethod, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.pendingMessages.set(id, { resolve, reject });
      console.log(
        `[RpcClient] Webview is sending message ${id} with method ${method} with params ${JSON.stringify(
          params
        )}`
      );
      vscode.postMessage({ type: "rpc", id, method, params });
    });
  }

  public handleMessage(event: MessageEvent) {
    const message = event.data;
    if (message.type === "rpcResponse") {
      console.log("[RpcClient] Webview received rpcResponse message", message);
      const pending = this.pendingMessages.get(message.id);
      if (pending) {
        this.pendingMessages.delete(message.id);
        if (message.error) {
          console.log(
            `[RpcClient] rejecting message ${message.id} with error ${message.error}`
          );
          pending.reject(message.error);
        } else {
          console.log(
            `[RpcClient] resolving message ${message.id} with result ${message.result}`
          );
          pending.resolve(message.result);
        }
      } else {
        console.warn(
          `[RpcClient] received response for unknown message ${message.id}`
        );
      }
    }
  }
}
