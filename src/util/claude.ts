import * as vscode from 'vscode';
import { Claude as ClaudeSDK } from '@anthropic-ai/sdk';
import Anthropic from '@anthropic-ai/sdk';

export class Claude {
    private static instance: Anthropic;

    private static getInstance(): Anthropic {
        if (!Claude.instance) {
            const apiKey = vscode.workspace.getConfiguration('spectacle').get('anthropicApiKey') as string;
            if (!apiKey) {
                throw new Error('Anthropic API key is not set. Please set it in the extension settings.');
            }
            Claude.instance = new Anthropic({ apiKey });
        }
        return Claude.instance;
    }

    public static sendMessageStream(message: string): Promise<Anthropic.StreamingResponse> {
        const client = Claude.getInstance();
        return client.messages.stream({
            max_tokens: 1024,
            messages: [{ role: 'user', content: message }],
            model: 'claude-3-5-sonnet-20240620',
        });
    }
}
