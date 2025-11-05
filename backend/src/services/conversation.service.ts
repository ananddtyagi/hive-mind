import { randomUUID } from 'crypto';
import type {
  Conversation,
  Message,
  MessageRole,
  MessageType,
  ConversationStatus,
  ModelSelection,
  BotConfig,
} from '../../../shared/types';
import { BotRegistry } from './bot-registry.service';
import { SpecialistBot } from '../bots/specialist.bot';
import { getModelById } from '../config/models.config';

/**
 * Manages conversations and orchestrates bot interactions
 */
export class ConversationService {
  private conversations: Map<string, Conversation> = new Map();
  private botRegistry: BotRegistry;
  private broadcastCallback?: (conversationId: string, conversation: Conversation) => void;

  constructor(botRegistry: BotRegistry, broadcastCallback?: (conversationId: string, conversation: Conversation) => void) {
    this.botRegistry = botRegistry;
    this.broadcastCallback = broadcastCallback;
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    initialQuestion: string,
    debateMode: boolean = true,
    selectedModels?: ModelSelection[]
  ): Promise<{ conversation: Conversation; initialMessage: Message }> {
    const conversationId = randomUUID();

    // Create dynamic bots from model selections
    let participatingBots: string[] = [];

    if (selectedModels && selectedModels.length > 0) {
      // Create instances for each selected model
      for (const selection of selectedModels) {
        const modelConfig = getModelById(selection.modelId);
        if (!modelConfig) {
          console.warn(`Model ${selection.modelId} not found, skipping`);
          continue;
        }

        // Create the specified number of instances
        for (let i = 0; i < selection.count; i++) {
          const botId = `${selection.modelId}-${randomUUID().substring(0, 8)}`;
          const instanceNum = i + 1;

          const botConfig: BotConfig = {
            id: botId,
            name: `${modelConfig.name}${selection.count > 1 ? ` #${instanceNum}` : ''}`,
            role: `Debate participant using ${modelConfig.name}`,
            model: modelConfig.modelId, // OpenRouter model ID
            tools: ['search'],
            systemPrompt: `You are participating in a collaborative debate about: "${initialQuestion}"

Your role:
- Provide thoughtful, well-reasoned perspectives
- Engage constructively with other participants
- Challenge assumptions when appropriate
- Build on others' ideas
- Aim for comprehensive, nuanced answers

Be concise but thorough. Each response should add value to the discussion.`,
            temperature: 0.7,
            maxTokens: 2000,
            enabled: true,
          };

          // Register this bot instance dynamically
          this.botRegistry.addBot(botConfig);
          participatingBots.push(botId);
        }
      }
    } else {
      // Use default pre-configured bots
      participatingBots = this.botRegistry.getAllBots()
        .filter(bot => bot.getConfig().id !== 'moderator')
        .map(bot => bot.getConfig().id);
    }

    const conversation: Conversation = {
      id: conversationId,
      userId,
      status: debateMode ? 'debating' : 'gathering-context',
      title: initialQuestion,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pendingQuestions: [],
      researchTasks: [],
      currentPhase: debateMode ? 'Starting debate' : 'Analyzing your question',
      debateMode,
      debateRound: debateMode ? 1 : undefined,
      participatingBots: debateMode ? participatingBots : undefined,
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

    // Start the appropriate flow
    if (debateMode) {
      await this.startDebate(conversationId);
    } else {
      await this.processUserMessage(conversationId, initialQuestion);
    }

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
    const moderatorModel = this.botRegistry.getModerator().getConfig().model;
    const thinkingMessage = this.createMessage(
      conversationId,
      'moderator',
      'moderator-thinking',
      decision.reasoning,
      { modelName: moderatorModel }
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
      { botId, modelName: this.botRegistry.getModerator().getConfig().model }
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
        { botId, modelName: botConfig.model }
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
      report,
      { modelName: moderator.getConfig().model }
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

  // ==================== Debate Mode Methods ====================

  /**
   * Start a debate between multiple AI models
   */
  private async startDebate(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || !conversation.participatingBots) return;

    // Start with the first bot
    await this.getNextDebateResponse(conversationId);
  }

  /**
   * Get the next response in the debate
   */
  private async getNextDebateResponse(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || !conversation.participatingBots) return;

    // Check if debate is stopped
    if (conversation.status === 'stopped') return;

    // Get the next bot to respond
    const botIndex = (conversation.messages.filter(m => m.type === 'bot-response').length) % conversation.participatingBots.length;
    const botId = conversation.participatingBots[botIndex];

    const bot = this.botRegistry.getBot(botId);
    if (!bot) {
      console.error(`Bot not found: ${botId}`);
      return;
    }

    const botConfig = bot.getConfig();
    conversation.activeBot = botId;
    conversation.currentPhase = `${botConfig.name} is responding`;

    // Build context from previous messages
    const context = this.buildDebateContext(conversation);

    try {
      const specialist = bot as SpecialistBot;

      // Create a debate prompt
      const debatePrompt = `You are participating in a collaborative debate with other AI models about the following topic:

"${conversation.title}"

Previous discussion:
${context}

Provide your perspective, insights, or counterpoints. Build upon or respectfully challenge the previous points. Be thoughtful and substantive.`;

      const response = await specialist.answerQuery(debatePrompt);

      // Add the response
      const responseMessage = this.createMessage(
        conversationId,
        'bot',
        'bot-response',
        response,
        { botId, modelName: botConfig.model }
      );
      conversation.messages.push(responseMessage);
      conversation.updatedAt = Date.now();

      // Update round number
      const totalResponses = conversation.messages.filter(m => m.type === 'bot-response').length;
      conversation.debateRound = Math.ceil(totalResponses / conversation.participatingBots.length);

      // Broadcast the update
      if (this.broadcastCallback) {
        this.broadcastCallback(conversationId, conversation);
      }

      // Continue the debate if not stopped
      if (conversation.status === 'debating') {
        // Add a small delay before the next response to prevent rate limiting
        setTimeout(() => {
          this.getNextDebateResponse(conversationId);
        }, 1000);
      }
    } catch (error) {
      console.error(`Error getting debate response from ${botId}:`, error);

      const errorMessage = this.createMessage(
        conversationId,
        'system',
        'system-message',
        `Error getting response from ${botConfig.name}. Continuing with other participants.`
      );
      conversation.messages.push(errorMessage);

      // Continue with next bot
      if (conversation.status === 'debating') {
        setTimeout(() => {
          this.getNextDebateResponse(conversationId);
        }, 1000);
      }
    }
  }

  /**
   * Build context from debate history
   */
  private buildDebateContext(conversation: Conversation): string {
    const recentMessages = conversation.messages
      .filter(m => m.type === 'bot-response')
      .slice(-6); // Last 6 messages for context

    if (recentMessages.length === 0) {
      return 'No previous discussion yet. You are the first to respond.';
    }

    let context = '';
    recentMessages.forEach((m, idx) => {
      const botName = m.botId ? this.botRegistry.getBot(m.botId)?.getConfig().name : 'Unknown';
      const modelName = m.modelName || 'Unknown Model';
      context += `\n[${botName} (${modelName})]: ${m.content}\n`;
    });

    return context;
  }

  /**
   * Stop the ongoing debate
   */
  async stopDebate(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.status = 'stopped';
    conversation.currentPhase = 'Debate stopped';
    conversation.activeBot = undefined;
    conversation.updatedAt = Date.now();

    const stopMessage = this.createMessage(
      conversationId,
      'system',
      'system-message',
      'Debate has been stopped by the user.'
    );
    conversation.messages.push(stopMessage);
  }

  /**
   * Generate a conclusion/summary of the debate
   */
  async generateConclusion(conversationId: string): Promise<string> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    conversation.status = 'synthesizing';
    conversation.currentPhase = 'Generating conclusion';

    const moderator = this.botRegistry.getModerator();

    // Build the full debate context
    const debateHistory = this.buildDebateContext(conversation);

    const conclusionPrompt = `Analyze and summarize the following AI debate:

Topic: "${conversation.title}"

Debate discussion:
${debateHistory}

Provide a comprehensive conclusion that:
1. Summarizes the key points and perspectives presented
2. Identifies areas of agreement and disagreement
3. Highlights the most valuable insights
4. Provides a balanced synthesis of the discussion

Your conclusion:`;

    const conclusion = await moderator.synthesizeReport(conversation);

    const conclusionMessage = this.createMessage(
      conversationId,
      'moderator',
      'final-report',
      conclusion,
      { modelName: moderator.getConfig().model }
    );

    conversation.messages.push(conclusionMessage);
    conversation.status = 'completed';
    conversation.currentPhase = 'Concluded';
    conversation.updatedAt = Date.now();

    return conclusion;
  }
}
