import axios, { AxiosResponse, AxiosError } from "axios";
import * as vscode from "vscode";

interface AiderResponse {
  message: string;
  file_changes: any;
  usage_info: any;
}

let aiderUrl: string;

export async function initializeAider() {
  aiderUrl =
    (vscode.workspace
      .getConfiguration("spectacle")
      .get("aiderServerUrl") as string) || "http://0.0.0.0:8000";

  try {
    console.log("rootpath: ", vscode.workspace.rootPath);
    await axios.post(`${aiderUrl}/startup`, {
      root_dir: vscode.workspace.rootPath,
    });
    console.log("Aider server initialized successfully");
  } catch (error: unknown) {
    handleAiderError(error, "Failed to initialize Aider server");
  }
}

export async function sendMessageToAider(
  userInput: string
): Promise<AiderResponse> {
  try {
    const response: AxiosResponse<AiderResponse> = await axios.post(
      `${aiderUrl}/aider/code`,
      {
        message: userInput,
      }
    );

    return {
      message: response.data.message,
      file_changes: response.data.file_changes,
      usage_info: response.data.usage_info,
    };
  } catch (error: unknown) {
    handleAiderError(error, "Error sending message to Aider");
    throw error;
  }
}

function handleAiderError(error: unknown, defaultMessage: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.code === "ECONNREFUSED") {
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
      `${defaultMessage}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
