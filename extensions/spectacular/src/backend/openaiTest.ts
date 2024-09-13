import { OpenAIConversation, OpenAIMessage } from "../types";
import { streamOpenAI, Models } from "./openaiAPI";

export async function testOpenAI(): Promise<string> {
    const conversation: OpenAIConversation = {
        system: "You are a helpful assistant.",
        messages: [
            {
                role: "user",
                content: "Write a haiku about artificial intelligence."
            }
        ]
    };

    try {
        const response = await streamOpenAI(conversation, {
            model: Models.GPT35Turbo,
            processPartial: (partial) => {
                console.log("Partial response:", partial);
            }
        });

        console.log("Full response:", response);
        return response;
    } catch (error) {
        console.error("Error in OpenAI test:", error);
        throw error;
    }
}

