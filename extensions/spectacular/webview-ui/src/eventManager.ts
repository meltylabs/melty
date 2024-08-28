import { v4 as uuidv4 } from 'uuid';
type EventCallback = (event: MessageEvent) => void;

export class EventManager {
	private static _instance: EventManager;
	private listeners: Map<string, Set<EventCallback>> = new Map();
	private id = uuidv4();

	private constructor() { this.init(); }

	public static get Instance() {
		return this._instance || (this._instance = new this());
	}

	addListener(type: string, callback: EventCallback) {
		console.log(`[EventManager ${this.id}] Adding listener for ,${type},`);
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Set());
		}
		this.listeners.get(type)!.add(callback);
		this.printListenersCounts();
	}

	removeListener(type: string, callback: EventCallback) {
		this.printListenersCounts();
		console.log(`[EventManager ${this.id}] Removing listener for ${type}`);
		this.listeners.get(type)?.delete(callback);
	}

	private printListenersCounts() {
		console.log(
			Array.from(this.listeners).map(([type, listeners]) => {
				return `[EventManager ${this.id}] there are now ${listeners.size} listeners for ,${type},`;
			})
				.join("\n")
		);
	}

	handleMessage = (event: MessageEvent) => {
		this.printListenersCounts();
		const message = event.data;
		if (message.type) {
			console.log(`[EventManager ${this.id}] Handling message of type ,${message.type},`);
			console.log(`[EventManager ${this.id}] listeners list is ${this.listeners.get(message.type)}`);
			console.log(`[EventManager ${this.id}] Dispatching to ${this.listeners.get(message.type)?.size ?? 0} listeners`);
			this.listeners.get(message.type)?.forEach(callback => callback(event));
		}
	}

	init() {
		window.addEventListener('message', this.handleMessage);
	}

	cleanup() {
		window.removeEventListener('message', this.handleMessage);
	}
}
