# JIRA Ticket Creator

AI-powered JIRA ticket generation with swappable LLM providers.

## Architecture

```
jira-ticket-creator/
├── src/
│   ├── components/          # React UI components
│   │   ├── TicketForm/
│   │   ├── TicketPreview/
│   │   ├── common/
│   │   └── index.ts
│   ├── services/            # Business logic
│   │   ├── llm/             # LLM abstraction layer
│   │   │   ├── providers/   # Concrete implementations
│   │   │   ├── LLMProvider.ts
│   │   │   ├── LLMFactory.ts
│   │   │   └── index.ts
│   │   ├── ticket/          # Ticket generation logic
│   │   └── index.ts
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript definitions
│   ├── utils/               # Utility functions
│   ├── prompts/             # LLM prompt templates
│   ├── config/              # App configuration
│   └── App.tsx
├── server/                  # Backend API (keeps API keys secure)
│   ├── routes/
│   ├── middleware/
│   └── index.ts
├── .env.example
├── package.json
└── README.md
```

## Key Design Decisions

### 1. LLM Provider Abstraction (Strategy Pattern)

Swap between Claude, GPT, Gemini, or local models without changing business logic:

```typescript
// Usage
const provider = LLMFactory.create('claude');
const ticket = await ticketService.generate(input, provider);

// Swap providers easily
const provider = LLMFactory.create('openai');
const provider = LLMFactory.create('ollama');
```

### 2. Separation of Concerns

- **Components**: Pure UI, no business logic
- **Services**: Business logic, LLM orchestration
- **Hooks**: State management, side effects
- **Prompts**: Versioned, testable prompt templates

### 3. Backend API

API keys stay on the server. The frontend calls your backend, which calls the LLM:

```
[React App] → [Your API] → [LLM Provider]
```

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your API keys to .env

# Run development server
npm run dev
```

## Environment Variables

```env
# LLM Providers (add the ones you want to use)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Default provider
DEFAULT_LLM_PROVIDER=claude

# Server
PORT=3001
```

## Supported LLM Providers

| Provider | Model | Status |
|----------|-------|--------|
| Anthropic Claude | claude-sonnet-4-20250514 | ✅ Ready |
| OpenAI | gpt-4o | ✅ Ready |
| Google Gemini | gemini-pro | 🔧 Planned |
| Ollama (local) | llama3, mistral | 🔧 Planned |

## License

MIT
