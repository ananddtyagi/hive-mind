/**
 * Core types for Hive-Mind collaborative AI system
 */

// ==================== Bot Configuration ====================

export type ToolType = 'search' | 'code' | 'calculator' | 'web-fetch';

export interface BotConfig {
  id: string;
  name: string;
  role: string; // Brief description of the bot's specialty
  model: string; // OpenRouter model ID (e.g., "anthropic/claude-3-sonnet")
  tools: ToolType[];
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  enabled?: boolean;
}

// ==================== Message Types ====================

export type MessageRole = 'user' | 'moderator' | 'bot' | 'system';

export type MessageType =
  | 'user-question'           // Initial user question
  | 'clarifying-question'     // Moderator asking user for clarification
  | 'user-response'           // User answering clarifying question
  | 'user-interjection'       // User providing additional info mid-conversation
  | 'bot-query'               // Moderator querying a specialist bot
  | 'bot-response'            // Specialist bot responding to moderator
  | 'moderator-thinking'      // Moderator's internal reasoning (visible to user)
  | 'progress-update'         // Moderator updating user on progress
  | 'final-report'            // Moderator's final synthesized answer
  | 'system-message';         // System notifications

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: number;

  // Metadata
  botId?: string;              // ID of bot that sent/received this message
  modelName?: string;          // Model used to generate this message
  parentMessageId?: string;    // For threading conversations
  toolsUsed?: ToolUsage[];     // Tools used to generate this message
  metadata?: Record<string, any>;
}

export interface ToolUsage {
  tool: ToolType;
  query: string;
  result: string;
  timestamp: number;
}

// ==================== Conversation State ====================

export type ConversationStatus =
  | 'gathering-context'    // Moderator asking clarifying questions
  | 'researching'          // Bots working on gathering information
  | 'synthesizing'         // Moderator compiling final report
  | 'completed'            // Report delivered
  | 'paused'               // Waiting for user input
  | 'debating'             // Ongoing debate between models
  | 'stopped';             // User stopped the debate

export interface Conversation {
  id: string;
  userId: string;
  status: ConversationStatus;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;

  // State tracking
  activeBot?: string;          // Which bot is currently "speaking"
  pendingQuestions: string[];  // Questions moderator still wants to ask user
  researchTasks: ResearchTask[];
  currentPhase: string;        // Human-readable phase description

  // Debate mode tracking
  debateMode?: boolean;        // Whether this is a debate conversation
  debateRound?: number;        // Current round of debate
  participatingBots?: string[]; // Bots participating in the debate
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

// ==================== Moderator Decision Making ====================

export interface ModeratorDecision {
  action: 'ask-user' | 'query-bot' | 'synthesize-report' | 'continue-research';
  reasoning: string;
  target?: string; // User or bot ID
  content: string;
  nextSteps: string[];
}

// ==================== API Request/Response Types ====================

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

// ==================== WebSocket Events ====================

export type WSEventType =
  | 'message-added'
  | 'conversation-updated'
  | 'bot-thinking'
  | 'error';

export interface WSEvent {
  type: WSEventType;
  data: any;
  timestamp: number;
}

// ==================== OpenRouter Types ====================

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

// ==================== Search Tool Types ====================

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
