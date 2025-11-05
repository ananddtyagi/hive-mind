import axios, { AxiosInstance } from 'axios';
import type { OpenRouterMessage, OpenRouterRequest, OpenRouterResponse } from '../../../shared/types';

/**
 * Service for interacting with OpenRouter API
 * OpenRouter provides unified access to multiple AI models
 */
export class OpenRouterService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
        'X-Title': 'Hive-Mind',
      },
    });
  }

  /**
   * Send a completion request to OpenRouter
   */
  async complete(request: OpenRouterRequest): Promise<string> {
    try {
      const response = await this.client.post<OpenRouterResponse>(
        '/chat/completions',
        request
      );

      const choice = response.data.choices[0];
      if (!choice || !choice.message) {
        throw new Error('Invalid response from OpenRouter');
      }

      return choice.message.content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`OpenRouter API error (${status}): ${message}`);
      }
      throw error;
    }
  }

  /**
   * Send a chat message and get a response
   */
  async chat(
    model: string,
    messages: OpenRouterMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    } = {}
  ): Promise<string> {
    const request: OpenRouterRequest = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      top_p: options.topP ?? 1.0,
    };

    return this.complete(request);
  }

  /**
   * Check if the API key is valid
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.chat(
        'openai/gpt-3.5-turbo', // Use a cheap model for validation
        [{ role: 'user', content: 'Hi' }],
        { maxTokens: 5 }
      );
      return true;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  /**
   * Get available models (for future use)
   */
  async getModels(): Promise<any[]> {
    try {
      const response = await this.client.get('/models');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }
}
