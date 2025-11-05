import React, { useState } from 'react';
import type { BotConfig } from '@shared/types';

interface WelcomeScreenProps {
  onStart: (question: string, selectedBots?: string[]) => void;
  availableBots: BotConfig[];
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, availableBots }) => {
  const [question, setQuestion] = useState('');
  const [selectedBots, setSelectedBots] = useState<string[]>([]);

  const exampleQuestions = [
    "Should I use WebRTC or WebSocket for real-time video chat?",
    "How do I integrate Twilio SMS into my Node.js app?",
    "What's the best way to implement authentication in a React app?",
    "Compare PostgreSQL vs MongoDB for a social media app",
    "How do I set up CI/CD for a Next.js application?",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      onStart(question.trim(), selectedBots.length > 0 ? selectedBots : undefined);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuestion(example);
  };

  const handleBotToggle = (botId: string) => {
    setSelectedBots(prev =>
      prev.includes(botId)
        ? prev.filter(id => id !== botId)
        : [...prev, botId]
    );
  };

  const handleSelectAll = () => {
    const specialistBots = availableBots.filter(bot => bot.id !== 'moderator');
    setSelectedBots(specialistBots.map(bot => bot.id));
  };

  const handleClearAll = () => {
    setSelectedBots([]);
  };

  // Filter out moderator from the list
  const specialistBots = availableBots.filter(bot => bot.id !== 'moderator');

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-3xl w-full">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🧠</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Hive-Mind
          </h1>
          <p className="text-lg text-gray-600">
            A collaborative AI system where multiple specialist models work together to solve your complex questions
          </p>
        </div>

        {/* How it works */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-2">1️⃣</div>
              <div className="text-sm font-medium text-gray-900 mb-1">
                Ask your question
              </div>
              <div className="text-xs text-gray-600">
                Select AI models to participate
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">2️⃣</div>
              <div className="text-sm font-medium text-gray-900 mb-1">
                Watch the debate
              </div>
              <div className="text-xs text-gray-600">
                AI models discuss and debate in real-time
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">3️⃣</div>
              <div className="text-sm font-medium text-gray-900 mb-1">
                Generate conclusion
              </div>
              <div className="text-xs text-gray-600">
                Stop anytime and get a summary
              </div>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Select AI Models ({selectedBots.length} selected)
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-gray-600 hover:text-gray-700 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 mb-4">
            {selectedBots.length === 0
              ? 'All models will participate if none are selected'
              : `${selectedBots.length} model${selectedBots.length !== 1 ? 's' : ''} will participate in the debate`
            }
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {specialistBots.map((bot) => (
              <label
                key={bot.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedBots.includes(bot.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedBots.includes(bot.id)}
                  onChange={() => handleBotToggle(bot.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{bot.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{bot.role}</div>
                  <div className="text-xs text-gray-400 mt-1">{bot.model}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to know?
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a complex question that requires research and expert analysis..."
              rows={4}
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={!question.trim()}
            className="btn btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Conversation
          </button>
        </form>

        {/* Example questions */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Or try an example:
          </h3>
          <div className="space-y-2">
            {exampleQuestions.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-sm text-gray-700"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-500">
          <p>Powered by OpenRouter • Built with multiple AI models</p>
        </div>
      </div>
    </div>
  );
};
