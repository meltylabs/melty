
export class CustomError extends Error {
	private displayMessage: string;

	constructor(message: string, error?: Error) {
		super(error?.message || message);
		this.displayMessage = message;
		this.name = 'CustomError';
	}

	getDisplayMessage(): string {
		return this.displayMessage;
	}
}
