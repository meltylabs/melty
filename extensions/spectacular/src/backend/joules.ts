import { v4 as uuidv4 } from "uuid";

import { Joule, JouleHuman, JouleBot, BotExecInfo, DiffInfo, ClaudeMessage, UserAttachedImage, JouleImage, DehydratedJoule } from "../types";
import * as datastores from './datastores';

export function createJouleError(errorMessage: string): JouleBot {
	return createJouleBot(errorMessage, {
		rawOutput: "[error encountered]",
		contextPaths: {
			meltyRoot: '',
			paths: []
		},
	});
}

export async function createJouleHuman(message: string, images?: UserAttachedImage[]): Promise<JouleHuman> {
	return createJouleHumanWithChanges(message, null, null, images);
}

export async function createJouleHumanWithChanges(
	message: string,
	commit: string | null,
	diffInfo: DiffInfo | null,
	images?: UserAttachedImage[]
): Promise<JouleHuman> {
	const id = uuidv4();
	const imagesData: JouleImage[] | undefined = images ? await datastores.saveJouleImagesToDisk(images) : [];

	return {
		id,
		message,
		author: "human",
		state: "complete",
		commit,
		diffInfo,
		images: imagesData,
	};
}

export function createJouleBot(
	message: string,
	botExecInfo: BotExecInfo,
	state: "complete" | "partial" = "complete"
): JouleBot {
	return createJouleBotWithChanges(message, botExecInfo, null, null, state);
}

export function createJouleBotWithChanges(
	message: string,
	botExecInfo: BotExecInfo,
	commit: string | null,
	diffInfo: DiffInfo | null,
	state: "complete" | "partial" = "complete"
): JouleBot {
	const id = uuidv4();
	return {
		id,
		message,
		author: "bot",
		state,
		commit,
		diffInfo: diffInfo,
		botExecInfo: botExecInfo,
	};
}

export function updateMessage(joule: Joule, message: string): Joule {
	return { ...joule, message };
}

export async function formatMessageForClaude(joule: Joule): Promise<ClaudeMessage['content']> {
	// note that if we show a processed message, we'll need to use `message.length ? message : "..."`
	// to ensure no Anthropic API errors
	switch (joule.author) {
		case "human":
			if (joule.images && joule.images.length > 0) {
				const content: ClaudeMessage['content'] = [];
				for (const img of joule.images) {
					const { buffer, exists } = await datastores.readImageFromDisk(img.path);
					if (!exists) {
						console.warn(`Skipping image ${img.path} as it doesn't exist`);
						continue;
					}

					const base64 = buffer.toString('base64');
					content.push({
						type: 'image',
						source: {
							type: 'base64',
							data: base64,
							media_type: img.mimeType
						}
					});
				}
				if (joule.message) {
					content.push({
						type: 'text',
						text: joule.message
					});
				}
				return content;
			}
			return joule.message;
		case "bot":
			return (joule as JouleBot)?.botExecInfo?.rawOutput ?? "";
	}
}

// reads images in the joule and converts them to base64 to be rendered on the ui
export async function dehydrate(joule: Joule): Promise<DehydratedJoule> {
	return {
		...joule,
		images: joule.images ? await Promise.all(joule.images.map(async (img) => {
			const { buffer } = await datastores.readImageFromDisk(img.path);
			let base64 = buffer.toString('base64');
			// add the data:image\/\w+;base64, prefix
			base64 = `data:${img.mimeType};base64,${base64}`;

			return {
				mimeType: img.mimeType,
				base64: base64
			};
		})) : undefined
	};
}
