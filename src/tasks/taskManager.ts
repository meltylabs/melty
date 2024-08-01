import * as fs from 'fs';
import * as path from 'path';
import { PromptFormatter } from './askClaude';
import { Claude } from '../util/claude';
import * as vscode from 'vscode';
import { Task, MessageEvent } from './task';
import { Util } from '../util/util';

export class TaskManager {
    private workspaceRoot: string;
    private taskFolder: string;
    private currentTask: Task | null = null;
    private outputChannel: vscode.OutputChannel;

    constructor(workspaceRoot: string, outputChannel: vscode.OutputChannel) {
        this.workspaceRoot = workspaceRoot;
        this.outputChannel = outputChannel;
        this.taskFolder = path.join(workspaceRoot, '.spectacle');
        if (!fs.existsSync(this.taskFolder)) {
            fs.mkdirSync(this.taskFolder, { recursive: true });
        }
        this.outputChannel.appendLine(`TaskManager initialized with workspace root: ${workspaceRoot}`);
    }

    async ensureTaskStarted(): Promise<Task> {
        this.outputChannel.appendLine('TaskManager: Ensuring task is started');
        if (!this.currentTask) {
            this.outputChannel.appendLine('TaskManager: No current task, creating new task');
            this.currentTask = this.createTask();
            this.outputChannel.appendLine(`TaskManager: New task created: ${this.currentTask.id}`);
        } else {
            this.outputChannel.appendLine(`TaskManager: Using existing task: ${this.currentTask.id}`);
        }
        return this.currentTask;
    }

    getWorkspaceRoot(): string {
        return this.workspaceRoot;
    }

    getCurrentTask(): Task | null {
        return this.currentTask;
    }

    setCurrentTask(task: Task) {
        this.currentTask = task;
    }

    createTask(identifier?: string): Task {
        const now = new Date();
        const dateTime = now.toISOString().replace(/[-:]/g, '').slice(0, 15);
        const id = identifier ? `${dateTime}_${identifier}` : dateTime;
        
        const task: Task = {
            id,
            messageEvents: [],
            status: 'open'
        };
        this.saveTask(task);
        return task;
    }

    saveTask(task: Task) {
        const filePath = path.join(this.taskFolder, `${task.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(task, null, 2));
    }

    loadTask(id: string): Task | null {
        const filePath = path.join(this.taskFolder, `${id}.json`);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content) as Task;
        }
        return null;
    }

    addMessageEvent(task: Task, event: MessageEvent) {
        task.messageEvents.push(event);
        this.saveTask(task);
    }

    updateTaskStatus(task: Task, status: 'open' | 'discarded' | 'committed') {
        task.status = status;
        this.saveTask(task);
    }

    async handleHumanMessage(task: Task, text: string) {
        this.outputChannel.appendLine(`TaskManager: Handling human message for task ${task.id}: ${text}`);
        console.log(`TaskManager: Handling human message for task ${task.id}: ${text}`);
        try {
            const messageEvent: MessageEvent = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                author: 'user',
                text
            };
            this.outputChannel.appendLine(`TaskManager: Created message event: ${JSON.stringify(messageEvent)}`);
            console.log(`TaskManager: Created message event: ${JSON.stringify(messageEvent)}`);
            
            this.outputChannel.appendLine('TaskManager: Adding message event to task');
            this.addMessageEvent(task, messageEvent);
            this.outputChannel.appendLine(`TaskManager: Added message event to task`);
            console.log(`TaskManager: Added message event to task`);
            
            this.outputChannel.appendLine('TaskManager: Creating commit for message event');
            try {
                await this.createCommit(task, messageEvent);
                this.outputChannel.appendLine(`TaskManager: Created commit for message event`);
                console.log(`TaskManager: Created commit for message event`);
            } catch (commitError) {
                this.outputChannel.appendLine(`TaskManager: Error creating commit: ${commitError}`);
                console.error(`TaskManager: Error creating commit:`, commitError);
                // Don't throw here, continue with the process
            }
            
            this.outputChannel.appendLine(`TaskManager: Human message handled successfully for task ${task.id}`);
            console.log(`TaskManager: Human message handled successfully for task ${task.id}`);
        } catch (error) {
            this.outputChannel.appendLine(`TaskManager: Error handling human message for task ${task.id}: ${error}`);
            console.error(`TaskManager: Error handling human message for task ${task.id}:`, error);
            throw error;
        }
    }

    async createAIResponse(task: Task) {
        this.outputChannel.appendLine(`Creating AI response for task ${task.id}`);
        try {
            const workspacePrompt = PromptFormatter.formatTextDocuments(vscode.workspace.textDocuments, this.workspaceRoot);
            const historyPrompt = PromptFormatter.formatMessageHistory(task.messageEvents);

            const fullPrompt = `You are an expert programmer. Help this user with their task. Provide your response in a clear and concise manner.
            <MessageHistory> contains the conversation this user has had with us.
            <Workspace> contains the current state of all text documents in their workspace.
    ${historyPrompt}
    ${workspacePrompt}

    Please provide your response to assist the user with their task.`;

            this.outputChannel.appendLine('Sending prompt to Claude');
            
            let fullResponse = '';
            const stream = await Claude.sendMessageStream(fullPrompt);
            
            for await (const chunk of stream) {
                if (chunk.type === 'content_block_start' || chunk.type === 'content_block_delta') {
                    if ('delta' in chunk && 'text' in chunk.delta && chunk.delta.text) {
                        fullResponse += chunk.delta.text;
                        // Update the chat view with the partial response
                        vscode.commands.executeCommand('spectacle.chatView.updatePartialResponse', fullResponse);
                    }
                }
            }
            
            this.outputChannel.appendLine('Received full response from Claude');

            let formattedResponse: string;
            if (typeof fullResponse === 'object' && fullResponse !== null) {
                formattedResponse = JSON.stringify(fullResponse, null, 2);
            } else {
                formattedResponse = fullResponse.toString();
            }

            const messageEvent: MessageEvent = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                author: 'ai',
                text: formattedResponse,
                prompt: fullPrompt,
                response: formattedResponse
            };

            this.addMessageEvent(task, messageEvent);
            this.outputChannel.appendLine(`AI response created successfully for task ${task.id}`);

            // Finalize the AI response in the chat view
            vscode.commands.executeCommand('spectacle.chatView.finalizeAIResponse');

            return messageEvent;
        } catch (error) {
            this.outputChannel.appendLine(`Error creating AI response for task ${task.id}: ${error}`);
            // Finalize the AI response in the chat view even in case of error
            vscode.commands.executeCommand('spectacle.chatView.finalizeAIResponse');
            throw error;
        }
    }

    private async createCommit(task: Task, messageEvent: MessageEvent) {
        // Implement Git commit logic
        // Use the messageEvent.id and author for the commit message

        // const commitSha = await this.gitService.createCommit(`${messageEvent.author}: ${messageEvent.id}`);

        // Update the messageEvent with the commitSha
        // messageEvent.commitSha = commitSha;

        // Save the updated task
        this.saveTask(task);
    }

    resetCurrentTask() {
        this.outputChannel.appendLine(`TaskManager: Resetting current task`);
        if (this.currentTask) {
            this.currentTask.messageEvents = [];
            this.saveTask(this.currentTask);
        }
        this.outputChannel.appendLine(`TaskManager: Current task reset`);
    }

}
