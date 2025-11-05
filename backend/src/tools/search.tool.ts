import axios from 'axios';
import type { SearchQuery, SearchResult, SearchResponse } from '../../../shared/types';

/**
 * Search tool for retrieving information from the web
 * Supports multiple search providers (Tavily, Serper)
 */
export class SearchTool {
  private tavilyApiKey?: string;
  private serperApiKey?: string;

  constructor(config: { tavilyApiKey?: string; serperApiKey?: string }) {
    this.tavilyApiKey = config.tavilyApiKey;
    this.serperApiKey = config.serperApiKey;

    if (!this.tavilyApiKey && !this.serperApiKey) {
      console.warn('No search API keys configured. Search functionality will be limited.');
    }
  }

  /**
   * Perform a web search
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    // Try Tavily first (better for AI use cases)
    if (this.tavilyApiKey) {
      try {
        return await this.searchWithTavily(query);
      } catch (error) {
        console.error('Tavily search failed:', error);
      }
    }

    // Fallback to Serper
    if (this.serperApiKey) {
      try {
        return await this.searchWithSerper(query);
      } catch (error) {
        console.error('Serper search failed:', error);
      }
    }

    // If both fail or aren't configured, return empty results
    return {
      results: [],
      query: query.query,
      timestamp: Date.now(),
    };
  }

  /**
   * Search using Tavily API
   */
  private async searchWithTavily(query: SearchQuery): Promise<SearchResponse> {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        query: query.query,
        max_results: query.maxResults || 5,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tavilyApiKey}`,
        },
      }
    );

    const results: SearchResult[] = response.data.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      relevanceScore: result.score,
    }));

    return {
      results,
      query: query.query,
      timestamp: Date.now(),
    };
  }

  /**
   * Search using Serper API
   */
  private async searchWithSerper(query: SearchQuery): Promise<SearchResponse> {
    const response = await axios.post(
      'https://google.serper.dev/search',
      {
        q: query.query,
        num: query.maxResults || 5,
      },
      {
        headers: {
          'X-API-KEY': this.serperApiKey!,
          'Content-Type': 'application/json',
        },
      }
    );

    const results: SearchResult[] = (response.data.organic || []).map((result: any) => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
    }));

    return {
      results,
      query: query.query,
      timestamp: Date.now(),
    };
  }

  /**
   * Format search results for LLM consumption
   */
  formatResultsForLLM(searchResponse: SearchResponse): string {
    if (searchResponse.results.length === 0) {
      return 'No search results found.';
    }

    let formatted = `Search results for "${searchResponse.query}":\n\n`;

    searchResponse.results.forEach((result, index) => {
      formatted += `${index + 1}. ${result.title}\n`;
      formatted += `   URL: ${result.url}\n`;
      formatted += `   ${result.snippet}\n\n`;
    });

    return formatted;
  }
}
