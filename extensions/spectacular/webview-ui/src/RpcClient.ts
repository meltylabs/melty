import { vscode } from "./utilities/vscode";
import { RpcMethod, RpcResponseMessage } from "./types";
import { EventManager, EventCallback } from "./eventManager";

export class RpcClient {
	private static instance: RpcClient | null = null;
	private messageId = 0;

	private handleMessage: EventCallback;

	private pendingMessages = new Map<
		number,
		{ resolve: (value: any) => void; reject: (reason?: any) => void }
	>();

	public static getInstance(): RpcClient {
		if (!RpcClient.instance) {
			console.log("[RpcClient] Creating new RpcClient instance");
			RpcClient.instance = new RpcClient();
		}
		return RpcClient.instance;
	}

	protected constructor() {
		this.handleMessage = (
			(message: RpcResponseMessage) => {
				console.log(`[RpcClient] Webview received rpcResponse message ${message.id} (${message.type})`);
				const pending = this.pendingMessages.get(message.id);
				if (pending) {
					this.pendingMessages.delete(message.id);
					if (message.error) {
						console.log(
							`[RpcClient] rejecting message ${message.id} (${message.type}) with error`, message.error
						);
						pending.reject(message.error);
					} else {
						// console.log(
						// 	`[RpcClient] resolving message ${message.id} (${message.type}) with result`, message.result
						// );
						pending.resolve(message.result);
					}
				};
			}
		) as EventCallback;
		EventManager.Instance.addListener("rpcResponse", this.handleMessage);
	}

	public dispose() {
		EventManager.Instance.removeListener("rpcResponse", this.handleMessage);
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
}
