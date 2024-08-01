import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface MessageEvent {
    id: string;
    timestamp: number;
    author: 'user' | 'ai';
    text: string;
    prompt?: string;
    response?: string;
    commitSha?: string;
    diff?: string;
}

export interface Task {
    id: string;
    messageEvents: MessageEvent[];
    status: 'open' | 'discarded' | 'committed';
}
