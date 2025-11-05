/**
 * Core types for Hive-Mind collaborative AI system
 */
export type ToolType = 'search' | 'code' | 'calculator' | 'web-fetch';
export interface BotConfig {
    id: string;
    name: string;
    role: string;
    model: string;
    tools: ToolType[];
    systemPrompt: string;
    temperature?: number;
    maxTokens?: number;
    enabled?: boolean;
}
export type MessageRole = 'user' | 'moderator' | 'bot' | 'system';
export type MessageType = 'user-question' | 'clarifying-question' | 'user-response' | 'user-interjection' | 'bot-query' | 'bot-response' | 'moderator-thinking' | 'progress-update' | 'final-report' | 'system-message';
export interface Message {
    id: string;
    conversationId: string;
    role: MessageRole;
    type: MessageType;
    content: string;
    timestamp: number;
    botId?: string;
    modelName?: string;
    parentMessageId?: string;
    toolsUsed?: ToolUsage[];
    metadata?: Record<string, any>;
}
export interface ToolUsage {
    tool: ToolType;
    query: string;
    result: string;
    timestamp: number;
}
export type ConversationStatus = 'gathering-context' | 'researching' | 'synthesizing' | 'completed' | 'paused' | 'debating' | 'stopped';
export interface Conversation {
    id: string;
    userId: string;
    status: ConversationStatus;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
    activeBot?: string;
    pendingQuestions: string[];
    researchTasks: ResearchTask[];
    currentPhase: string;
    debateMode?: boolean;
    debateRound?: number;
    participatingBots?: string[];
}
export interface ResearchTask {
    id: string;
    description: string;
    assignedBotId: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    result?: string;
    createdAt: number;
    completedAt?: number;
}
export interface ModeratorDecision {
    action: 'ask-user' | 'query-bot' | 'synthesize-report' | 'continue-research';
    reasoning: string;
    target?: string;
    content: string;
    nextSteps: string[];
}
export interface CreateConversationRequest {
    userId: string;
    initialQuestion: string;
}
export interface CreateConversationResponse {
    conversation: Conversation;
    initialMessage: Message;
}
export interface SendMessageRequest {
    conversationId: string;
    content: string;
    type: MessageType;
}
export interface SendMessageResponse {
    message: Message;
    conversation: Conversation;
}
export interface GetConversationRequest {
    conversationId: string;
}
export interface GetConversationResponse {
    conversation: Conversation;
}
export type WSEventType = 'message-added' | 'conversation-updated' | 'bot-thinking' | 'error';
export interface WSEvent {
    type: WSEventType;
    data: any;
    timestamp: number;
}
export interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface OpenRouterRequest {
    model: string;
    messages: OpenRouterMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}
export interface OpenRouterResponse {
    id: string;
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export interface SearchQuery {
    query: string;
    maxResults?: number;
}
export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    relevanceScore?: number;
}
export interface SearchResponse {
    results: SearchResult[];
    query: string;
    timestamp: number;
}
//# sourceMappingURL=index.d.ts.map