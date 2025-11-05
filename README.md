# 🧠 Hive-Mind

A collaborative AI chat system where multiple specialist AI models work together to solve complex problems. Instead of a single model, Hive-Mind uses a moderator bot to orchestrate multiple specialist bots, each with their own expertise and tools.

## ✨ Features

- **🎯 Intelligent Orchestration**: A moderator bot analyzes questions, asks for clarification, and delegates to specialist bots
- **🤖 Multiple Specialist Bots**: Pre-configured experts in search, technical decisions, code, and integrations
- **🔍 Search Integration**: Bots can search the web using Tavily or Serper APIs
- **💬 Natural Conversation Flow**: The moderator asks clarifying questions and keeps you updated on progress
- **🔄 Real-time Updates**: WebSocket integration for live conversation updates
- **⚙️ Easy Bot Configuration**: Add new bots with a simple JSON-like configuration
- **🎨 Clean, Friendly UI**: Modern interface with no gradients, just clean design

## 🏗️ Architecture

```
User Question
     ↓
  Moderator Bot
     ↓
  ┌──┴──┬──────┬────────┐
  ↓     ↓      ↓        ↓
Search  Tech  Code  Integration
 Bot    Bot   Bot      Bot
  └─────┴──────┴────────┘
          ↓
    Synthesized Report
          ↓
        User
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenRouter API key ([get one here](https://openrouter.ai/))
- Optional: Tavily or Serper API key for search functionality

### Installation

1. **Clone and install dependencies**:
```bash
npm run install:all
```

2. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here  # Optional
SERPER_API_KEY=your_serper_api_key_here  # Optional
```

3. **Start the application**:
```bash
npm run dev
```

This will start both the backend (port 3001) and frontend (port 3000).

4. **Open your browser**:
```
http://localhost:3000
```

## 📚 How It Works

### The Conversation Flow

1. **User asks a question**: "Should I use WebRTC or WebSocket for my app?"

2. **Moderator analyzes**: Determines if clarification is needed or which bots to consult

3. **Specialist bots work**:
   - Search bot finds latest documentation
   - Technical expert compares trade-offs
   - Integration specialist provides implementation details

4. **Moderator synthesizes**: Combines all information into a comprehensive report

5. **User receives answer**: A well-researched, multi-perspective response

### Example Questions

- "Should I use WebRTC or WebSocket for real-time video chat?"
- "How do I integrate Twilio SMS into my Node.js app?"
- "What's the best database for a social media application?"
- "Compare authentication methods for a React app"
- "How do I set up CI/CD for Next.js?"

## 🤖 Built-in Specialist Bots

### Search Specialist
- **Tools**: Web search (Tavily/Serper)
- **Expertise**: Finding current information, documentation, tutorials
- **Model**: Claude 3.5 Sonnet

### Technical Expert
- **Tools**: Web search
- **Expertise**: Architecture decisions, technology comparisons, system design
- **Model**: Claude 3.5 Sonnet

### Code Specialist
- **Tools**: Web search
- **Expertise**: Code examples, implementation details, debugging
- **Model**: Claude 3.5 Sonnet

### Integration Specialist
- **Tools**: Web search
- **Expertise**: API integrations, third-party services (Twilio, Stripe, etc.)
- **Model**: GPT-4 Turbo

## ⚙️ Adding New Bots

Adding a new specialist bot is easy! Just edit `backend/src/config/bots.config.ts`:

```typescript
{
  id: 'my-custom-bot',
  name: 'My Custom Bot',
  role: 'Expert at doing something specific',
  model: 'anthropic/claude-3.5-sonnet',
  tools: ['search'], // Available: 'search', 'code', etc.
  systemPrompt: `You are an expert in...`,
  temperature: 0.7,
  maxTokens: 2000,
  enabled: true,
}
```

The bot will automatically be available to the moderator!

## 🛠️ Tech Stack

### Backend
- **Node.js + TypeScript**: Server runtime
- **Express**: REST API
- **WebSocket (ws)**: Real-time updates
- **OpenRouter**: Multi-model AI access
- **Tavily/Serper**: Search APIs

### Frontend
- **React + TypeScript**: UI framework
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Axios**: HTTP client
- **React Markdown**: Message rendering

## 📁 Project Structure

```
hive-mind/
├── backend/
│   ├── src/
│   │   ├── bots/          # Bot implementations
│   │   ├── services/      # Core services
│   │   ├── tools/         # Bot tools (search, etc.)
│   │   ├── config/        # Bot configurations
│   │   └── index.ts       # Server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API & WebSocket services
│   │   ├── styles/        # CSS styles
│   │   └── App.tsx        # Main app component
│   └── package.json
├── shared/
│   └── types/             # Shared TypeScript types
└── package.json
```

## 🔧 Configuration

### OpenRouter Models

You can use any model available on OpenRouter. Popular choices:

- `anthropic/claude-3.5-sonnet` - Best for reasoning
- `openai/gpt-4-turbo` - Great all-rounder
- `google/gemini-pro` - Good for analysis
- `meta-llama/llama-3-70b` - Open source option

### Search Providers

**Tavily** (Recommended for AI applications):
- Sign up at [tavily.com](https://tavily.com)
- Best for AI-powered search with clean results

**Serper** (Alternative):
- Sign up at [serper.dev](https://serper.dev)
- Google search API access

## 🎯 Use Cases

Perfect for questions that require:
- **Research**: "What are the latest best practices for..."
- **Comparison**: "Should I use X or Y for my use case?"
- **Integration**: "How do I connect service A to service B?"
- **Technical decisions**: "What architecture pattern should I use?"
- **Learning**: "Explain how X works and show me examples"

## 🤝 Contributing

This is a starting point! Ideas for enhancements:

- [ ] Add more tool integrations (code execution, image generation)
- [ ] Implement conversation history persistence
- [ ] Add user authentication
- [ ] Create more specialized bots
- [ ] Add conversation export/sharing
- [ ] Implement cost tracking per conversation

## 📝 License

MIT

## 🙏 Acknowledgments

- Built with [OpenRouter](https://openrouter.ai/) for multi-model access
- Search powered by [Tavily](https://tavily.com/) and [Serper](https://serper.dev/)
- Inspired by the concept of collaborative AI systems

---

**Made with 🧠 by the Hive**
