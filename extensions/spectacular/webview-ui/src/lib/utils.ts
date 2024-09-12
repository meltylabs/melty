import { UserAttachedImage } from '@/types';
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CustomError } from "./errors";
import { vscode } from '@/utilities/vscode';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_SIZE } from '@/constants';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

function isImageMimeTypeSupported(mimeType: string) {
	const allowedMimeTypes = ALLOWED_IMAGE_MIME_TYPES

	return allowedMimeTypes.includes(mimeType);
}

export async function imagePasteHandler(event: React.ClipboardEvent<HTMLTextAreaElement>, callback: (imgs: UserAttachedImage[]) => void) {
	const clipboardData = event.clipboardData;
	if (clipboardData && clipboardData.items) {
		const images = Array.from(clipboardData.items).filter((item) => item.kind === 'file' && item.type.indexOf("image") !== -1);
		try {
			const isImageSupported = images.every((image) => isImageMimeTypeSupported(image.type));
			if (!isImageSupported) {
				throw new CustomError('Only JPEG, PNG, GIF, and WebP images are supported');
			}

			if (images.length > 0) {
				// do not bubble up the event
				event.preventDefault();
				const imgs: UserAttachedImage[] = [];
				for (const image of images) {
					const type = image.type;
					const file = image.getAsFile()!;
					if (!file) {
						throw new CustomError('Cannot read the image file. Please try again');
					}
					if (file.size >= MAX_IMAGE_SIZE) {
						throw new CustomError('Image size exceeds 5MB. Please paste a smaller image');
					}
					const blobUrl = URL.createObjectURL(file);
					const base64 = await blobToBase64(blobUrl);

					// this check is required because claude api throws error even if file size is less than 5MB
					// but the base64 string is greater than 5MB
					if (base64.length >= MAX_IMAGE_SIZE) {
						throw new CustomError('Image size exceeds 5MB. Please paste a smaller image');
					}

					imgs.push({
						blobUrl,
						mimeType: type,
						base64
					});
				}
				callback(imgs);
			}
		} catch (error) {
			if (error instanceof CustomError) {
				throw error;
			}
			const wrappedError = new CustomError('Failed to paste image', error as Error);
			throw wrappedError;
		}
	}
}

export function blobToBase64(blobUrl: string): Promise<string> {
	return new Promise((resolve, reject) => {
		// Fetch the Blob from the blob URL
		fetch(blobUrl)
			.then((response) => response.blob())
			.then((blob) => {
				const reader = new FileReader();

				// When FileReader finishes reading, resolve the promise with base64 string
				reader.onloadend = () => {
					if (typeof reader.result !== "string") {
						reject(new Error("Failed to read Blob as base64"));
						return;
					}
					resolve(reader.result);
				};

				// Handle errors in reading
				reader.onerror = reject;

				// Read the Blob as a data URL (base64)
				reader.readAsDataURL(blob);
			})
			.catch(reject);
	});
}

export function showNotification(message: string, type: 'success' | 'error' = 'success') {
	vscode.postMessage({
		type: 'rpc', method: 'showNotification', params: {
			message, notificationType: type
		}
	});
}
