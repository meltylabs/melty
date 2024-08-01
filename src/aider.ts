import axios from 'axios';
import * as vscode from 'vscode';

export async function sendMessageToAider(userInput: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            // Ensure the Aider server is started                                                                                                                                        
            await axios.post('http://0.0.0.0:8000/startup', {
                root_dir: vscode.workspace.rootPath
            });

            // Send the command to Aider                                                                                                                                                 
            const response = await axios.post('http://0.0.0.0:8000/aider/sendCommand', {
                message: userInput
            });

            resolve(response.data.message);
        } catch (error: any) {
            vscode.window.showErrorMessage('Failed to connect to Aider server. Please ensure the server is running.');
            reject(`Aider command failed: ${error.message}`);
        }
    });
}                                                                                                                                                                                        