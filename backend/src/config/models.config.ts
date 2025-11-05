export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string; // OpenRouter model ID
  description: string;
  contextWindow: number;
  pricing?: {
    prompt: number; // per 1M tokens
    completion: number; // per 1M tokens
  };
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    modelId: 'anthropic/claude-3.5-sonnet',
    description: 'Most intelligent model, best for complex reasoning and analysis',
    contextWindow: 200000,
    pricing: {
      prompt: 3,
      completion: 15,
    },
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    modelId: 'anthropic/claude-3-opus',
    description: 'Powerful model for complex tasks requiring deep understanding',
    contextWindow: 200000,
    pricing: {
      prompt: 15,
      completion: 75,
    },
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    modelId: 'anthropic/claude-3-haiku',
    description: 'Fast and efficient, great for quick responses',
    contextWindow: 200000,
    pricing: {
      prompt: 0.25,
      completion: 1.25,
    },
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    modelId: 'openai/gpt-4-turbo',
    description: 'Powerful general-purpose model with broad knowledge',
    contextWindow: 128000,
    pricing: {
      prompt: 10,
      completion: 30,
    },
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    modelId: 'openai/gpt-4o',
    description: 'Fast and intelligent, optimized for speed and quality',
    contextWindow: 128000,
    pricing: {
      prompt: 5,
      completion: 15,
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    modelId: 'openai/gpt-3.5-turbo',
    description: 'Fast and cost-effective for simpler tasks',
    contextWindow: 16385,
    pricing: {
      prompt: 0.5,
      completion: 1.5,
    },
  },
  {
    id: 'gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    provider: 'Google',
    modelId: 'google/gemini-pro-1.5',
    description: 'Google\'s advanced model with large context window',
    contextWindow: 1000000,
    pricing: {
      prompt: 2.5,
      completion: 10,
    },
  },
  {
    id: 'llama-3.1-70b',
    name: 'Llama 3.1 70B',
    provider: 'Meta',
    modelId: 'meta-llama/llama-3.1-70b-instruct',
    description: 'Open-source model with strong performance',
    contextWindow: 131072,
    pricing: {
      prompt: 0.88,
      completion: 0.88,
    },
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    provider: 'Mistral',
    modelId: 'mistralai/mixtral-8x7b-instruct',
    description: 'Efficient mixture-of-experts model',
    contextWindow: 32768,
    pricing: {
      prompt: 0.54,
      completion: 0.54,
    },
  },
];

export function getModelById(modelId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

export function getModelByOpenRouterId(openRouterId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find(m => m.modelId === openRouterId);
}
