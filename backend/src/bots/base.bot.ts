import type { BotConfig, OpenRouterMessage, ToolUsage } from '../../../shared/types';
import { OpenRouterService } from '../services/openrouter.service';
import { SearchTool } from '../tools/search.tool';

/**
 * Base class for all bots in the Hive-Mind system
 */
export abstract class BaseBot {
  protected config: BotConfig;
  protected openRouter: OpenRouterService;
  protected searchTool?: SearchTool;

  constructor(
    config: BotConfig,
    openRouter: OpenRouterService,
    searchTool?: SearchTool
  ) {
    this.config = config;
    this.openRouter = openRouter;
    this.searchTool = searchTool;
  }

  /**
   * Get bot configuration
   */
  getConfig(): BotConfig {
    return this.config;
  }

  /**
   * Check if bot has a specific tool
   */
  hasTool(tool: string): boolean {
    return this.config.tools.includes(tool as any);
  }

  /**
   * Generate a response to a message
   */
  async respond(
    prompt: string,
    conversationHistory: OpenRouterMessage[] = []
  ): Promise<{ response: string; toolsUsed: ToolUsage[] }> {
    const toolsUsed: ToolUsage[] = [];

    // Build the messages array
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: this.config.systemPrompt },
      ...conversationHistory,
      { role: 'user', content: prompt },
    ];

    // Check if the bot needs to use tools
    let enhancedPrompt = prompt;

    // If bot has search capability and prompt seems to need it, perform search
    if (this.hasTool('search') && this.shouldUseSearch(prompt)) {
      const searchResults = await this.performSearch(prompt);
      if (searchResults) {
        enhancedPrompt = `${prompt}\n\n${searchResults.formatted}`;
        toolsUsed.push({
          tool: 'search',
          query: searchResults.query,
          result: searchResults.formatted,
          timestamp: Date.now(),
        });

        // Update the last message with search results
        messages[messages.length - 1].content = enhancedPrompt;
      }
    }

    // Get response from the model
    const response = await this.openRouter.chat(
      this.config.model,
      messages,
      {
        temperature: this.config.temperature ?? 0.7,
        maxTokens: this.config.maxTokens ?? 2000,
      }
    );

    return { response, toolsUsed };
  }

  /**
   * Determine if search should be used for this prompt
   */
  private shouldUseSearch(prompt: string): boolean {
    const searchKeywords = [
      'latest',
      'current',
      'recent',
      'search',
      'find',
      'look up',
      'what is',
      'how to',
      'documentation',
      'tutorial',
      'guide',
    ];

    const lowerPrompt = prompt.toLowerCase();
    return searchKeywords.some(keyword => lowerPrompt.includes(keyword));
  }

  /**
   * Perform a search and format results
   */
  private async performSearch(prompt: string): Promise<{
    query: string;
    formatted: string;
  } | null> {
    if (!this.searchTool) {
      return null;
    }

    try {
      // Extract a good search query from the prompt
      const searchQuery = this.extractSearchQuery(prompt);

      const searchResponse = await this.searchTool.search({
        query: searchQuery,
        maxResults: 5,
      });

      const formatted = this.searchTool.formatResultsForLLM(searchResponse);

      return {
        query: searchQuery,
        formatted,
      };
    } catch (error) {
      console.error('Search failed:', error);
      return null;
    }
  }

  /**
   * Extract a search query from a prompt
   */
  private extractSearchQuery(prompt: string): string {
    // Simple extraction - in a more advanced version, could use an LLM
    // Remove common question words and keep the core query
    let query = prompt
      .replace(/^(please|can you|could you|would you)\s+/gi, '')
      .replace(/^(search for|find|look up|tell me about)\s+/gi, '')
      .replace(/\?$/g, '')
      .trim();

    // Limit length
    if (query.length > 100) {
      query = query.substring(0, 100);
    }

    return query;
  }
}
