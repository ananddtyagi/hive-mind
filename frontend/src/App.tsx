import React, { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Conversation } from './components/Conversation';
import { ApiService } from './services/api.service';
import type { Conversation as ConversationType, BotConfig } from '@shared/types';

// Generate a simple user ID (in production, use proper auth)
const USER_ID = 'user-' + Math.random().toString(36).substring(7);

function App() {
  const [conversation, setConversation] = useState<ConversationType | null>(null);
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load available bots on mount
  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const availableBots = await ApiService.getBots();
      setBots(availableBots);
    } catch (err) {
      console.error('Failed to load bots:', err);
    }
  };

  const handleStartConversation = async (question: string, selectedBots?: string[]) => {
    setError(null);

    // Create a temporary conversation to show immediately
    const tempConversation: ConversationType = {
      id: 'temp-' + Date.now(),
      userId: USER_ID,
      status: 'debating',
      title: question,
      messages: [{
        id: 'temp-msg-1',
        conversationId: 'temp',
        role: 'user',
        type: 'user-question',
        content: question,
        timestamp: Date.now(),
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pendingQuestions: [],
      researchTasks: [],
      currentPhase: 'Starting debate...',
      debateMode: true,
      debateRound: 1,
      participatingBots: selectedBots,
    };

    // Show the conversation immediately
    setConversation(tempConversation);

    try {
      const result = await ApiService.createConversation(USER_ID, question, selectedBots);
      setConversation(result.conversation);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError('Failed to start conversation. Please make sure the backend is running and try again.');
      setConversation(null);
    }
  };

  const handleConversationUpdate = (updatedConversation: ConversationType) => {
    setConversation(updatedConversation);
  };

  const handleNewConversation = () => {
    setConversation(null);
    setError(null);
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full card p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleNewConversation}
            className="btn btn-primary w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show conversation or welcome screen
  if (conversation) {
    return (
      <div className="relative">
        <Conversation
          conversation={conversation}
          onUpdate={handleConversationUpdate}
          bots={bots}
        />

        {/* New conversation button */}
        <button
          onClick={handleNewConversation}
          className="fixed bottom-6 left-6 btn btn-secondary shadow-lg"
          title="Start new conversation"
        >
          ← New Conversation
        </button>
      </div>
    );
  }

  return <WelcomeScreen onStart={handleStartConversation} availableBots={bots} />;
}

export default App;
