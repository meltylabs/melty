import axios, { AxiosResponse, AxiosError } from "axios";
import * as vscode from "vscode";

interface AiderResponse {
  message: string;
}

export async function sendMessageToAider(userInput: string): Promise<string> {
  const aiderUrl = vscode.workspace.getConfiguration('spectacle').get('aiderServerUrl') as string || 'http://0.0.0.0:8000';

  try {
    // Ensure the Aider server is started
    await axios.post(`${aiderUrl}/startup`, {
      root_dir: vscode.workspace.rootPath,
    });

    // Send the command to Aider
    const response: AxiosResponse<AiderResponse> = await axios.post(`${aiderUrl}/aider/sendCommand`, {
      message: userInput,
    });

    return response.data.message;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED') {
        vscode.window.showErrorMessage(
          "Failed to connect to Aider server. Please ensure the server is running."
        );
      } else {
        vscode.window.showErrorMessage(
          `Aider server error: ${axiosError.message}`
        );
      }
    } else {
      vscode.window.showErrorMessage(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    throw error;
  }
}
