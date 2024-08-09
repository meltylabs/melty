import { Conversation, GitRepo, Mode, Joule } from "../types";

export interface Assistant {
    respond(
        conversation: Conversation,
        gitRepo: GitRepo,
        contextPaths: string[],
        mode: Mode,
        processPartial: (partialConversation: Conversation) => void
    ): Promise<Conversation>;
}