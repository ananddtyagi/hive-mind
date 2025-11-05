import { BaseBot } from '../bots/base.bot';
import { ModeratorBot } from '../bots/moderator.bot';
import { SpecialistBot } from '../bots/specialist.bot';
import { OpenRouterService } from './openrouter.service';
import { SearchTool } from '../tools/search.tool';
import { MODERATOR_CONFIG, BOT_CONFIGS, BOT_CONFIG_MAP } from '../config/bots.config';
import type { BotConfig } from '../../../shared/types';

/**
 * Registry for managing all bot instances
 */
export class BotRegistry {
  private bots: Map<string, BaseBot> = new Map();
  private moderator: ModeratorBot;
  private openRouter: OpenRouterService;
  private searchTool: SearchTool;

  constructor(openRouter: OpenRouterService, searchTool: SearchTool) {
    this.openRouter = openRouter;
    this.searchTool = searchTool;

    // Initialize moderator
    this.moderator = new ModeratorBot(
      MODERATOR_CONFIG,
      openRouter,
      searchTool
    );

    // Initialize specialist bots
    this.initializeBots();
  }

  /**
   * Initialize all specialist bots from configuration
   */
  private initializeBots(): void {
    for (const config of BOT_CONFIGS) {
      if (config.enabled !== false) {
        const bot = this.createBot(config);
        this.bots.set(config.id, bot);
      }
    }

    console.log(`Initialized ${this.bots.size} specialist bots`);
  }

  /**
   * Create a bot instance from configuration
   */
  private createBot(config: BotConfig): BaseBot {
    // Provide search tool if bot needs it
    const searchTool = config.tools.includes('search') ? this.searchTool : undefined;

    return new SpecialistBot(config, this.openRouter, searchTool);
  }

  /**
   * Get the moderator bot
   */
  getModerator(): ModeratorBot {
    return this.moderator;
  }

  /**
   * Get a specialist bot by ID
   */
  getBot(botId: string): BaseBot | undefined {
    return this.bots.get(botId);
  }

  /**
   * Get all available bots
   */
  getAllBots(): BaseBot[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get all bot configurations
   */
  getAllConfigs(): BotConfig[] {
    return BOT_CONFIGS.filter(c => c.enabled !== false);
  }

  /**
   * Get bot configuration
   */
  getBotConfig(botId: string): BotConfig | undefined {
    return BOT_CONFIG_MAP.get(botId);
  }

  /**
   * Add a new bot dynamically
   */
  addBot(config: BotConfig): void {
    if (this.bots.has(config.id)) {
      throw new Error(`Bot with id "${config.id}" already exists`);
    }

    const bot = this.createBot(config);
    this.bots.set(config.id, bot);
    console.log(`Added new bot: ${config.name}`);
  }

  /**
   * Remove a bot
   */
  removeBot(botId: string): boolean {
    return this.bots.delete(botId);
  }

  /**
   * Get bots with a specific tool
   */
  getBotsWithTool(tool: string): BaseBot[] {
    return Array.from(this.bots.values()).filter(bot =>
      bot.getConfig().tools.includes(tool as any)
    );
  }
}
