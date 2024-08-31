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
	}

	removeListener(type: string, callback: EventCallback) {
		console.log(`[EventManager ${this.id}] Removing listener for ${type}`);
		this.listeners.get(type)?.delete(callback);
	}

	handleMessage = (event: MessageEvent) => {
		const message = event.data;
		if (message.type) {
			console.log(`[EventManager ${this.id}] Dispatching message ${message.type} to ${this.listeners.get(message.type)?.size ?? 0} listeners`);
			this.listeners.get(message.type)?.forEach(callback => {
				callback(event)
			});
		}
	}

	init() {
		console.log(`[EventManager ${this.id}] Initializing EventManager`);
		window.addEventListener('message', this.handleMessage);
	}

	cleanup() {
		window.removeEventListener('message', this.handleMessage);
	}
}
