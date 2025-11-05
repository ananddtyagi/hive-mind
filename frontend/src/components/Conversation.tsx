import React, { useEffect, useRef, useState } from 'react';
import type { Conversation as ConversationType, BotConfig } from '@shared/types';
import { Message } from './Message';
import { ChatInput } from './ChatInput';
import { StatusIndicator } from './StatusIndicator';
import { ApiService } from '../services/api.service';
import { wsService } from '../services/websocket.service';

interface ConversationProps {
  conversation: ConversationType;
  onUpdate: (conversation: ConversationType) => void;
  bots: BotConfig[];
}

export const Conversation: React.FC<ConversationProps> = ({
  conversation,
  onUpdate,
  bots,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Get bot name by ID
  const getBotName = (botId: string): string => {
    const bot = bots.find((b) => b.id === botId);
    return bot?.name || botId;
  };

  // Get active bot name
  const getActiveBotName = (): string | undefined => {
    if (conversation.activeBot) {
      return getBotName(conversation.activeBot);
    }
    return undefined;
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  // WebSocket connection
  useEffect(() => {
    // Connect to WebSocket
    wsService.connect(conversation.id);

    const handleConversationUpdate = (updatedConversation: ConversationType) => {
      onUpdate(updatedConversation);
    };

    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    wsService.on('conversation-updated', handleConversationUpdate);
    wsService.on('connected', handleConnected);
    wsService.on('disconnected', handleDisconnected);

    return () => {
      wsService.off('conversation-updated', handleConversationUpdate);
      wsService.off('connected', handleConnected);
      wsService.off('disconnected', handleDisconnected);
      wsService.disconnect();
    };
  }, [conversation.id, onUpdate]);

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    try {
      await ApiService.sendMessage(conversation.id, content);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  // Handle stopping the debate
  const handleStopDebate = async () => {
    try {
      await ApiService.stopDebate(conversation.id);
    } catch (error) {
      console.error('Failed to stop debate:', error);
      alert('Failed to stop debate. Please try again.');
    }
  };

  // Handle generating conclusion
  const handleGenerateConclusion = async () => {
    try {
      await ApiService.generateConclusion(conversation.id);
    } catch (error) {
      console.error('Failed to generate conclusion:', error);
      alert('Failed to generate conclusion. Please try again.');
    }
  };

  // Determine if input should be disabled
  const isInputDisabled = () => {
    return conversation.status === 'researching' || conversation.status === 'synthesizing';
  };

  // Get input placeholder
  const getInputPlaceholder = () => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    if (lastMessage?.type === 'clarifying-question') {
      return 'Answer the question above...';
    }

    if (conversation.status === 'completed') {
      return 'Ask a follow-up question...';
    }

    if (conversation.status === 'researching' || conversation.status === 'synthesizing') {
      return 'The hive is working...';
    }

    return 'Type your response...';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Hive-Mind</h1>
              <p className="text-sm text-gray-600 mt-1">
                {conversation.title.length > 80
                  ? conversation.title.substring(0, 80) + '...'
                  : conversation.title}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
                title={isConnected ? 'Connected' : 'Disconnected'}
              />
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <StatusIndicator
            status={conversation.status}
            currentPhase={conversation.currentPhase}
            activeBot={getActiveBotName()}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto">
          {conversation.messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              botName={message.botId ? getBotName(message.botId) : undefined}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input / Controls */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          {/* Show Stop button during active debate */}
          {conversation.status === 'debating' && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleStopDebate}
                className="btn bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                ⏸ Stop Debate
              </button>
              <div className="text-sm text-gray-500">
                Round {conversation.debateRound || 1} • {conversation.messages.filter(m => m.type === 'bot-response').length} responses
              </div>
            </div>
          )}

          {/* Show Conclusion button when stopped */}
          {conversation.status === 'stopped' && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleGenerateConclusion}
                className="btn bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                📋 Generate Conclusion
              </button>
              <div className="text-sm text-gray-500">
                Debate stopped after {conversation.messages.filter(m => m.type === 'bot-response').length} responses
              </div>
            </div>
          )}

          {/* Show regular input for non-debate modes */}
          {!conversation.debateMode && (
            <ChatInput
              onSend={handleSendMessage}
              disabled={isInputDisabled()}
              placeholder={getInputPlaceholder()}
            />
          )}

          {/* Show completion message */}
          {conversation.status === 'completed' && (
            <div className="text-center text-gray-500">
              <div className="text-sm">Debate concluded</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
