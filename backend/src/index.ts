import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from 'dotenv';
import { OpenRouterService } from './services/openrouter.service';
import { SearchTool } from './tools/search.tool';
import { BotRegistry } from './services/bot-registry.service';
import { ConversationService } from './services/conversation.service';
import type {
  CreateConversationRequest,
  SendMessageRequest,
  WSEvent,
} from '../../shared/types';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== Service Initialization ====================

// Check for required API keys
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('ERROR: OPENROUTER_API_KEY is required');
  process.exit(1);
}

// Initialize services
const openRouterService = new OpenRouterService(OPENROUTER_API_KEY);
const searchTool = new SearchTool({
  tavilyApiKey: process.env.TAVILY_API_KEY,
  serperApiKey: process.env.SERPER_API_KEY,
});

const botRegistry = new BotRegistry(openRouterService, searchTool);
const conversationService = new ConversationService(botRegistry);

console.log('✓ Services initialized');
console.log(`✓ Loaded ${botRegistry.getAllBots().length} specialist bots`);

// ==================== WebSocket Setup ====================

const wss = new WebSocketServer({ noServer: true });
const clients = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws: WebSocket, conversationId: string) => {
  console.log(`WebSocket connected for conversation: ${conversationId}`);

  // Add client to conversation room
  if (!clients.has(conversationId)) {
    clients.set(conversationId, new Set());
  }
  clients.get(conversationId)!.add(ws);

  ws.on('close', () => {
    console.log(`WebSocket disconnected from conversation: ${conversationId}`);
    clients.get(conversationId)?.delete(ws);
    if (clients.get(conversationId)?.size === 0) {
      clients.delete(conversationId);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast message to all clients in a conversation
function broadcastToConversation(conversationId: string, event: WSEvent) {
  const conversationClients = clients.get(conversationId);
  if (conversationClients) {
    const message = JSON.stringify(event);
    conversationClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// ==================== REST API Routes ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    bots: botRegistry.getAllConfigs().map(b => ({
      id: b.id,
      name: b.name,
      role: b.role,
    })),
  });
});

// Create a new conversation
app.post('/api/conversations', async (req, res) => {
  try {
    const { userId, initialQuestion }: CreateConversationRequest = req.body;

    if (!userId || !initialQuestion) {
      return res.status(400).json({
        error: 'userId and initialQuestion are required',
      });
    }

    const result = await conversationService.createConversation(
      userId,
      initialQuestion
    );

    // Broadcast to WebSocket clients
    broadcastToConversation(result.conversation.id, {
      type: 'conversation-updated',
      data: result.conversation,
      timestamp: Date.now(),
    });

    res.json(result);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      error: 'Failed to create conversation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get conversation by ID
app.get('/api/conversations/:id', (req, res) => {
  try {
    const conversation = conversationService.getConversation(req.params.id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Send a message in a conversation
app.post('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { content, type }: SendMessageRequest = req.body;
    const conversationId = req.params.id;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const conversation = conversationService.getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Process the message asynchronously
    conversationService.processUserMessage(conversationId, content, type).then(() => {
      const updatedConversation = conversationService.getConversation(conversationId);
      if (updatedConversation) {
        broadcastToConversation(conversationId, {
          type: 'conversation-updated',
          data: updatedConversation,
          timestamp: Date.now(),
        });
      }
    }).catch(error => {
      console.error('Error processing message:', error);
      broadcastToConversation(conversationId, {
        type: 'error',
        data: { error: 'Failed to process message' },
        timestamp: Date.now(),
      });
    });

    res.json({
      message: 'Message received and processing',
      conversationId,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get all conversations for a user
app.get('/api/users/:userId/conversations', (req, res) => {
  try {
    const conversations = conversationService.getUserConversations(
      req.params.userId
    );
    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching user conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get available bots
app.get('/api/bots', (req, res) => {
  try {
    const bots = botRegistry.getAllConfigs();
    res.json({ bots });
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

// ==================== Server Startup ====================

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Hive-Mind backend running on port ${PORT}`);
  console.log(`   HTTP: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws\n`);
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`);
  const conversationId = url.searchParams.get('conversationId');

  if (!conversationId) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, conversationId);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
