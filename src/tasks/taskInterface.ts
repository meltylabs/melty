import * as vscode from 'vscode';
import { Task } from './task';
import { TaskManager } from './taskManager';
import { ChatView } from '../chatView';

export class TaskInterface {
    private taskManager: TaskManager;
    private chatView: ChatView | undefined;

    constructor(taskManager: TaskManager) {
        this.taskManager = taskManager;
    }

    setChatView(chatView: ChatView) {
        this.chatView = chatView;
    }

    async startTask(identifier?: string) {
        if (!this.taskManager.getCurrentTask()) {
            const task = this.taskManager.createTask(identifier);
            this.taskManager.setCurrentTask(task);

            // Update the ChatView with the new task
            if (this.chatView) {
                this.chatView.updateWithTask(task);
            }

            // Focus the ChatView
            await vscode.commands.executeCommand('spectacle.chatView.focus');

            // Notify the user that the task has started
            vscode.window.showInformationMessage(`Task ${task.id} started. You can now chat in the Spectacle Chat view.`);
        }
        return this.taskManager.getCurrentTask();
    }

    async ensureTaskStarted() {
        let task = this.taskManager.getCurrentTask();
        if (!task) {
            task = await this.startTask();
        }
        return task;
    }
}
