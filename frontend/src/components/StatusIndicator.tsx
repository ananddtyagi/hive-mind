import React from 'react';
import type { ConversationStatus } from '@shared/types';

interface StatusIndicatorProps {
  status: ConversationStatus;
  currentPhase?: string;
  activeBot?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  currentPhase,
  activeBot,
}) => {
  const getStatusClass = () => {
    switch (status) {
      case 'gathering-context':
        return 'status-gathering';
      case 'researching':
        return 'status-researching';
      case 'synthesizing':
        return 'status-synthesizing';
      case 'completed':
        return 'status-completed';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'gathering-context':
        return '❓';
      case 'researching':
        return '🔍';
      case 'synthesizing':
        return '📝';
      case 'completed':
        return '✅';
      case 'paused':
        return '⏸️';
      default:
        return '⚙️';
    }
  };

  const getStatusText = () => {
    if (currentPhase) {
      return currentPhase;
    }

    switch (status) {
      case 'gathering-context':
        return 'Gathering context';
      case 'researching':
        return 'Researching';
      case 'synthesizing':
        return 'Preparing report';
      case 'completed':
        return 'Complete';
      case 'paused':
        return 'Paused';
      default:
        return 'Processing';
    }
  };

  const isActive = status !== 'completed' && status !== 'paused';

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`status-badge ${getStatusClass()}`}>
            <span className="mr-1">{getStatusIcon()}</span>
            {getStatusText()}
          </div>

          {isActive && (
            <div className="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>

        {activeBot && (
          <div className="text-sm text-gray-600">
            Active: <span className="font-medium">{activeBot}</span>
          </div>
        )}
      </div>

      {status === 'completed' && (
        <div className="mt-3 text-sm text-gray-600">
          The hive has finished analyzing your question. You can ask a follow-up question or start a new conversation.
        </div>
      )}
    </div>
  );
};
