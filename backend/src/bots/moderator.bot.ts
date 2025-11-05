import { BaseBot } from './base.bot';
import type {
  BotConfig,
  Conversation,
  Message,
  ModeratorDecision,
  OpenRouterMessage,
} from '../../../shared/types';

/**
 * Moderator Bot - Orchestrates the entire conversation
 * Decides when to ask users for clarification, when to query specialist bots,
 * and when to synthesize a final report
 */
export class ModeratorBot extends BaseBot {
  /**
   * Analyze the initial user question and decide next steps
   */
  async analyzeQuestion(
    question: string,
    conversation: Conversation
  ): Promise<ModeratorDecision> {
    const prompt = `You are the Moderator in a collaborative AI system. A user has asked:

"${question}"

Your job is to:
1. Determine if you need clarification from the user
2. Identify which specialist bots you should consult
3. Plan your research strategy

Available specialist bots:
${this.getAvailableBots()}

Analyze this question and respond in JSON format:
{
  "needsClarification": true/false,
  "clarifyingQuestions": ["question1", "question2"],
  "researchPlan": ["step1", "step2"],
  "botsToConsult": ["bot-id-1", "bot-id-2"],
  "reasoning": "your reasoning here"
}`;

    const { response } = await this.respond(prompt);

    // Parse the JSON response
    try {
      const analysis = this.extractJSON(response);

      if (analysis.needsClarification) {
        return {
          action: 'ask-user',
          reasoning: analysis.reasoning,
          content: analysis.clarifyingQuestions[0], // Ask one question at a time
          nextSteps: analysis.clarifyingQuestions.slice(1),
        };
      }

      return {
        action: 'query-bot',
        reasoning: analysis.reasoning,
        target: analysis.botsToConsult[0],
        content: this.formulateQueryForBot(question, analysis.botsToConsult[0]),
        nextSteps: analysis.researchPlan,
      };
    } catch (error) {
      console.error('Failed to parse moderator analysis:', error);

      // Fallback: start with search bot
      return {
        action: 'query-bot',
        reasoning: 'Starting with general search',
        target: 'search-specialist',
        content: question,
        nextSteps: ['Analyze results', 'Consult additional bots if needed'],
      };
    }
  }

  /**
   * Process a bot's response and decide next action
   */
  async processBotResponse(
    botResponse: string,
    botId: string,
    conversation: Conversation
  ): Promise<ModeratorDecision> {
    const conversationContext = this.buildConversationContext(conversation);

    const prompt = `You are the Moderator analyzing responses from specialist bots.

Original question: "${conversation.title}"

Bot "${botId}" responded with:
${botResponse}

Current conversation context:
${conversationContext}

Decide your next action:
1. "continue-research" - Query another bot for more information
2. "ask-user" - Ask the user for clarification or additional input
3. "synthesize-report" - You have enough information to provide a final answer

Respond in JSON format:
{
  "action": "continue-research" | "ask-user" | "synthesize-report",
  "reasoning": "your reasoning",
  "nextBot": "bot-id" (if continue-research),
  "question": "question for user" (if ask-user),
  "confidence": 0-100
}`;

    const { response } = await this.respond(prompt);

    try {
      const decision = this.extractJSON(response);

      if (decision.action === 'synthesize-report' || decision.confidence > 80) {
        return {
          action: 'synthesize-report',
          reasoning: decision.reasoning,
          content: '',
          nextSteps: [],
        };
      }

      if (decision.action === 'ask-user') {
        return {
          action: 'ask-user',
          reasoning: decision.reasoning,
          content: decision.question,
          nextSteps: [],
        };
      }

      return {
        action: 'query-bot',
        reasoning: decision.reasoning,
        target: decision.nextBot,
        content: this.formulateFollowUpQuery(botResponse, decision.nextBot),
        nextSteps: [],
      };
    } catch (error) {
      console.error('Failed to parse moderator decision:', error);

      // Fallback: synthesize if we have some information
      return {
        action: 'synthesize-report',
        reasoning: 'Proceeding to synthesize with available information',
        content: '',
        nextSteps: [],
      };
    }
  }

  /**
   * Synthesize final report from all bot responses
   */
  async synthesizeReport(conversation: Conversation): Promise<string> {
    const conversationContext = this.buildConversationContext(conversation);

    const prompt = `You are the Moderator synthesizing a final report.

Original question: "${conversation.title}"

All information gathered:
${conversationContext}

Create a comprehensive, well-structured report that:
1. Directly answers the user's question
2. Synthesizes information from all specialist bots
3. Provides actionable recommendations
4. Cites sources where relevant
5. Is clear, concise, and friendly

Write your report now:`;

    const { response } = await this.respond(prompt);
    return response;
  }

  /**
   * Generate a clarifying question for the user
   */
  async generateClarifyingQuestion(
    userQuestion: string,
    context: string
  ): Promise<string> {
    const prompt = `The user asked: "${userQuestion}"

Context: ${context}

Generate ONE clarifying question that would help you better understand what the user needs. Make it friendly and conversational.`;

    const { response } = await this.respond(prompt);
    return response.trim();
  }

  // ==================== Helper Methods ====================

  private getAvailableBots(): string {
    // This would be populated from the bot registry
    return `
- search-specialist: Expert at finding current information and documentation (has search tool)
- technical-expert: Expert at technical comparisons and architecture decisions
- code-specialist: Expert at code examples and implementation details
`;
  }

  private buildConversationContext(conversation: Conversation): string {
    let context = '';

    conversation.messages
      .filter(m => m.type !== 'system-message')
      .forEach(m => {
        context += `[${m.role}${m.botId ? ` - ${m.botId}` : ''}]: ${m.content}\n\n`;
      });

    return context;
  }

  private formulateQueryForBot(question: string, botId: string): string {
    // In a more advanced version, this would be more sophisticated
    return question;
  }

  private formulateFollowUpQuery(previousResponse: string, botId: string): string {
    return `Based on the previous information, provide additional insights: ${previousResponse.substring(0, 200)}...`;
  }

  private extractJSON(text: string): any {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // If no JSON found, try to parse the whole thing
    return JSON.parse(text);
  }
}
