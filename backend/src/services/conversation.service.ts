import { randomUUID } from 'crypto';
import type {
  Conversation,
  Message,
  MessageRole,
  MessageType,
  ConversationStatus,
} from '../../../shared/types';
import { BotRegistry } from './bot-registry.service';
import { SpecialistBot } from '../bots/specialist.bot';

/**
 * Manages conversations and orchestrates bot interactions
 */
export class ConversationService {
  private conversations: Map<string, Conversation> = new Map();
  private botRegistry: BotRegistry;

  constructor(botRegistry: BotRegistry) {
    this.botRegistry = botRegistry;
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    initialQuestion: string
  ): Promise<{ conversation: Conversation; initialMessage: Message }> {
    const conversationId = randomUUID();

    const conversation: Conversation = {
      id: conversationId,
      userId,
      status: 'gathering-context',
      title: initialQuestion,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pendingQuestions: [],
      researchTasks: [],
      currentPhase: 'Analyzing your question',
    };

    // Add initial user message
    const userMessage = this.createMessage(
      conversationId,
      'user',
      'user-question',
      initialQuestion
    );

    conversation.messages.push(userMessage);
    this.conversations.set(conversationId, conversation);

    // Start the conversation flow
    await this.processUserMessage(conversationId, initialQuestion);

    return {
      conversation: this.conversations.get(conversationId)!,
      initialMessage: userMessage,
    };
  }

  /**
   * Process a message from the user
   */
  async processUserMessage(
    conversationId: string,
    content: string,
    messageType: MessageType = 'user-response'
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Add user message if it's not the initial question
    if (messageType !== 'user-question') {
      const message = this.createMessage(
        conversationId,
        'user',
        messageType,
        content
      );
      conversation.messages.push(message);
    }

    conversation.updatedAt = Date.now();

    // Get moderator to analyze and decide next action
    const moderator = this.botRegistry.getModerator();

    if (conversation.messages.length === 1) {
      // Initial analysis
      conversation.currentPhase = 'Analyzing your question';
      const decision = await moderator.analyzeQuestion(content, conversation);
      await this.executeModeratorDecision(conversationId, decision);
    } else {
      // Continue conversation based on current state
      await this.continueConversation(conversationId);
    }
  }

  /**
   * Continue the conversation flow
   */
  private async continueConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    const moderator = this.botRegistry.getModerator();

    // Get last bot response
    const lastBotMessage = this.getLastBotMessage(conversation);
    if (!lastBotMessage) {
      // Start fresh research
      conversation.currentPhase = 'Starting research';
      const decision = await moderator.analyzeQuestion(conversation.title, conversation);
      await this.executeModeratorDecision(conversationId, decision);
      return;
    }

    // Decide next action based on bot response
    conversation.currentPhase = 'Analyzing information';
    const decision = await moderator.processBotResponse(
      lastBotMessage.content,
      lastBotMessage.botId!,
      conversation
    );

    await this.executeModeratorDecision(conversationId, decision);
  }

  /**
   * Execute a moderator decision
   */
  private async executeModeratorDecision(
    conversationId: string,
    decision: any
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    // Add moderator thinking message
    const thinkingMessage = this.createMessage(
      conversationId,
      'moderator',
      'moderator-thinking',
      decision.reasoning
    );
    conversation.messages.push(thinkingMessage);

    switch (decision.action) {
      case 'ask-user':
        await this.askUserQuestion(conversationId, decision.content);
        break;

      case 'query-bot':
        await this.queryBot(conversationId, decision.target, decision.content);
        break;

      case 'synthesize-report':
        await this.synthesizeReport(conversationId);
        break;

      case 'continue-research':
        await this.continueResearch(conversationId);
        break;
    }

    conversation.updatedAt = Date.now();
  }

  /**
   * Ask the user a clarifying question
   */
  private async askUserQuestion(
    conversationId: string,
    question: string
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.status = 'gathering-context';
    conversation.currentPhase = 'Waiting for your input';

    const message = this.createMessage(
      conversationId,
      'moderator',
      'clarifying-question',
      question
    );

    conversation.messages.push(message);
  }

  /**
   * Query a specialist bot
   */
  private async queryBot(
    conversationId: string,
    botId: string,
    query: string
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.status = 'researching';
    conversation.activeBot = botId;

    const bot = this.botRegistry.getBot(botId);
    if (!bot) {
      console.error(`Bot not found: ${botId}`);
      return;
    }

    const botConfig = bot.getConfig();
    conversation.currentPhase = `Consulting ${botConfig.name}`;

    // Add query message
    const queryMessage = this.createMessage(
      conversationId,
      'moderator',
      'bot-query',
      query,
      { botId }
    );
    conversation.messages.push(queryMessage);

    // Get bot response
    try {
      const specialist = bot as SpecialistBot;
      const response = await specialist.answerQuery(query);

      const responseMessage = this.createMessage(
        conversationId,
        'bot',
        'bot-response',
        response,
        { botId }
      );
      conversation.messages.push(responseMessage);

      // Continue the flow
      await this.continueConversation(conversationId);
    } catch (error) {
      console.error(`Error querying bot ${botId}:`, error);

      const errorMessage = this.createMessage(
        conversationId,
        'system',
        'system-message',
        `Error consulting ${botConfig.name}. Continuing with available information.`
      );
      conversation.messages.push(errorMessage);
    }
  }

  /**
   * Continue research with another bot
   */
  private async continueResearch(conversationId: string): Promise<void> {
    // Similar to queryBot but determines which bot to use
    await this.continueConversation(conversationId);
  }

  /**
   * Synthesize final report
   */
  private async synthesizeReport(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.status = 'synthesizing';
    conversation.currentPhase = 'Preparing your report';

    const moderator = this.botRegistry.getModerator();
    const report = await moderator.synthesizeReport(conversation);

    const reportMessage = this.createMessage(
      conversationId,
      'moderator',
      'final-report',
      report
    );

    conversation.messages.push(reportMessage);
    conversation.status = 'completed';
    conversation.currentPhase = 'Complete';
    conversation.activeBot = undefined;
  }

  /**
   * Get a conversation by ID
   */
  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get all conversations for a user
   */
  getUserConversations(userId: string): Conversation[] {
    return Array.from(this.conversations.values()).filter(
      c => c.userId === userId
    );
  }

  // ==================== Helper Methods ====================

  private createMessage(
    conversationId: string,
    role: MessageRole,
    type: MessageType,
    content: string,
    metadata?: Record<string, any>
  ): Message {
    return {
      id: randomUUID(),
      conversationId,
      role,
      type,
      content,
      timestamp: Date.now(),
      ...metadata,
    };
  }

  private getLastBotMessage(conversation: Conversation): Message | undefined {
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const msg = conversation.messages[i];
      if (msg.type === 'bot-response') {
        return msg;
      }
    }
    return undefined;
  }
}
