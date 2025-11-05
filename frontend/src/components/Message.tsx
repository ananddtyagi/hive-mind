import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message as MessageType } from '@shared/types';

interface MessageProps {
  message: MessageType;
  botName?: string;
}

export const Message: React.FC<MessageProps> = ({ message, botName }) => {
  const getMessageStyle = () => {
    switch (message.role) {
      case 'user':
        return 'message-bubble message-user';
      case 'moderator':
        return 'message-bubble message-moderator';
      case 'bot':
        return 'message-bubble message-bot';
      case 'system':
        return 'message-bubble message-system';
      default:
        return 'message-bubble';
    }
  };

  const getMessageLabel = () => {
    switch (message.role) {
      case 'user':
        return 'You';
      case 'moderator':
        return message.type === 'moderator-thinking' ? '💭 Moderator' : '🎯 Moderator';
      case 'bot':
        return `🤖 ${botName || 'Bot'}`;
      case 'system':
        return '⚙️ System';
      default:
        return '';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} mb-4 fade-in`}>
      <div className="flex items-center gap-2 mb-1 px-1">
        <span className="text-xs font-medium text-gray-600">{getMessageLabel()}</span>
        <span className="text-xs text-gray-400">{formatTimestamp(message.timestamp)}</span>
      </div>

      <div className={getMessageStyle()}>
        {message.type === 'moderator-thinking' && (
          <div className="text-xs font-medium text-purple-600 mb-1">Thinking...</div>
        )}

        {message.type === 'clarifying-question' && (
          <div className="text-xs font-medium text-blue-600 mb-1">Question for you:</div>
        )}

        {message.type === 'final-report' && (
          <div className="text-xs font-medium text-green-600 mb-2">📋 Final Report</div>
        )}

        <div className="markdown-content">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              🔧 Tools used: {message.toolsUsed.map(t => t.tool).join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
