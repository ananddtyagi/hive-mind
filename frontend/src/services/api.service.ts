import axios from 'axios';
import type {
  Conversation,
  CreateConversationRequest,
  CreateConversationResponse,
  BotConfig,
} from '@shared/types';

const API_BASE = '/api';

/**
 * API service for communicating with the backend
 */
export class ApiService {
  /**
   * Create a new conversation
   */
  static async createConversation(
    userId: string,
    initialQuestion: string,
    selectedBots?: string[]
  ): Promise<CreateConversationResponse> {
    const response = await axios.post<CreateConversationResponse>(
      `${API_BASE}/conversations`,
      {
        userId,
        initialQuestion,
        selectedBots,
      }
    );

    return response.data;
  }

  /**
   * Get a conversation by ID
   */
  static async getConversation(conversationId: string): Promise<Conversation> {
    const response = await axios.get<{ conversation: Conversation }>(
      `${API_BASE}/conversations/${conversationId}`
    );

    return response.data.conversation;
  }

  /**
   * Send a message in a conversation
   */
  static async sendMessage(
    conversationId: string,
    content: string,
    type: 'user-response' | 'user-interjection' = 'user-response'
  ): Promise<void> {
    await axios.post(`${API_BASE}/conversations/${conversationId}/messages`, {
      content,
      type,
    });
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId: string): Promise<Conversation[]> {
    const response = await axios.get<{ conversations: Conversation[] }>(
      `${API_BASE}/users/${userId}/conversations`
    );

    return response.data.conversations;
  }

  /**
   * Get available bots
   */
  static async getBots(): Promise<BotConfig[]> {
    const response = await axios.get<{ bots: BotConfig[] }>(`${API_BASE}/bots`);
    return response.data.bots;
  }

  /**
   * Check API health
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE}/health`);
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Stop an ongoing debate
   */
  static async stopDebate(conversationId: string): Promise<Conversation> {
    const response = await axios.post<{ conversation: Conversation }>(
      `${API_BASE}/conversations/${conversationId}/stop`
    );
    return response.data.conversation;
  }

  /**
   * Generate a conclusion for a debate
   */
  static async generateConclusion(conversationId: string): Promise<Conversation> {
    const response = await axios.post<{ conversation: Conversation }>(
      `${API_BASE}/conversations/${conversationId}/conclusion`
    );
    return response.data.conversation;
  }
}
