const { OpenAIConversation, OpenAIMessage } = require("../types");
const { streamOpenAI, Models } = require("./openaiAPI");

async function testOpenAI() {
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
            model: Models.O1,
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

module.exports = { testOpenAI };

