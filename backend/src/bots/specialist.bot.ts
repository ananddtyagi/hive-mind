import { BaseBot } from './base.bot';

/**
 * Generic specialist bot
 * Can be configured for different specialties via the BotConfig
 */
export class SpecialistBot extends BaseBot {
  /**
   * Answer a specific query within the bot's domain of expertise
   */
  async answerQuery(query: string, context?: string): Promise<string> {
    let prompt = query;

    if (context) {
      prompt = `Context: ${context}\n\nQuery: ${query}`;
    }

    const { response } = await this.respond(prompt);
    return response;
  }

  /**
   * Provide an expert opinion on a topic
   */
  async provideExpertOpinion(
    topic: string,
    specificQuestion: string
  ): Promise<string> {
    const prompt = `As an expert in ${this.config.role}, provide your professional opinion on:

Topic: ${topic}
Specific Question: ${specificQuestion}

Provide a detailed, well-reasoned response based on your expertise.`;

    const { response } = await this.respond(prompt);
    return response;
  }

  /**
   * Compare multiple options
   */
  async compareOptions(options: string[], criteria: string[]): Promise<string> {
    const prompt = `As an expert in ${this.config.role}, compare the following options:

Options:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Provide a detailed comparison with recommendations.`;

    const { response } = await this.respond(prompt);
    return response;
  }
}
