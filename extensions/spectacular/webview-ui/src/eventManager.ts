type EventCallback = (event: MessageEvent) => void;

class EventManager {
	private listeners: Map<string, Set<EventCallback>> = new Map();

	addListener(type: string, callback: EventCallback) {
		console.log(`[EventManager] Adding listener for ,${type},`);
		if (!this.listeners.has(type)) {
			this.listeners.set(type, new Set());
		}
		this.listeners.get(type)!.add(callback);
		this.printListenersCounts();
	}

	removeListener(type: string, callback: EventCallback) {
		this.printListenersCounts();
		console.log(`[EventManager] Removing listener for ${type}`);
		this.listeners.get(type)?.delete(callback);
	}

	private printListenersCounts() {
		console.log(
			Array.from(this.listeners).map(([type, listeners]) => {
				return `[EventManager] there are now ${listeners.size} listeners for ,${type},`;
			})
				.join("\n")
		);
	}

	handleMessage = (event: MessageEvent) => {
		this.printListenersCounts();
		const message = event.data;
		if (message.type) {
			console.log(`[EventManager] Handling message of type ,${message.type},`);
			console.log(`[EventManager] Dispatching to ${this.listeners.get(message.type)?.size ?? 0} listeners`);
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

export const eventManager = new EventManager();
