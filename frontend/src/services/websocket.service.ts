import type { WSEvent, Conversation } from '@shared/types';

type EventHandler = (data: any) => void;

/**
 * WebSocket service for real-time conversation updates
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private conversationId: string | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Connect to a conversation's WebSocket
   */
  connect(conversationId: string): void {
    if (this.ws && this.conversationId === conversationId) {
      return; // Already connected
    }

    this.disconnect();
    this.conversationId = conversationId;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?conversationId=${conversationId}`;

    console.log('Connecting to WebSocket:', wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected', { conversationId });
    };

    this.ws.onmessage = (event) => {
      try {
        const wsEvent: WSEvent = JSON.parse(event.data);
        this.handleEvent(wsEvent);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.emit('disconnected', { conversationId });
      this.ws = null;

      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
          if (this.conversationId) {
            this.connect(this.conversationId);
          }
        }, delay);
      }
    };
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.conversationId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to an event type
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from an event type
   */
  off(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  /**
   * Handle incoming WebSocket events
   */
  private handleEvent(event: WSEvent): void {
    console.log('WebSocket event:', event.type, event.data);
    this.emit(event.type, event.data);
  }

  /**
   * Emit an event to all registered handlers
   */
  private emit(eventType: string, data: any): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export a singleton instance
export const wsService = new WebSocketService();
