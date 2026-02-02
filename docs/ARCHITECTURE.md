# Architecture Overview

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   TicketForm │───▶│  useTicket   │───▶│ API Client      │   │
│  │   Component │    │  Hook        │    │ (fetch calls)   │   │
│  └─────────────┘    └──────────────┘    └────────┬─────────┘   │
│                                                   │             │
└───────────────────────────────────────────────────┼─────────────┘
                                                    │
                                                    ▼ HTTP
┌───────────────────────────────────────────────────┬─────────────┐
│                      Backend (Express)            │             │
│                                                   │             │
│  ┌─────────────┐    ┌──────────────┐    ┌────────┴────────┐   │
│  │   API       │───▶│  Ticket      │───▶│ LLM Factory    │   │
│  │   Routes    │    │  Service     │    │                │   │
│  └─────────────┘    └──────────────┘    └────────┬────────┘   │
│                                                   │             │
└───────────────────────────────────────────────────┼─────────────┘
                                                    │
                    ┌───────────────────────────────┼──────────────┐
                    │                               │              │
                    ▼                               ▼              ▼
          ┌─────────────────┐           ┌───────────────┐  ┌──────────────┐
          │  Claude Provider │           │ OpenAI Provider│  │Future Providers│
          │  (Anthropic API)│           │ (OpenAI API)  │  │ (Gemini, etc)│
          └─────────────────┘           └───────────────┘  └──────────────┘
```

## Key Design Patterns

### 1. Strategy Pattern (LLM Providers)

```typescript
// Interface (the strategy)
interface LLMProvider {
  generate(prompt: string): Promise<string>;
  complete(messages: LLMMessage[]): Promise<LLMCompletionResult>;
}

// Concrete strategies
class ClaudeProvider implements LLMProvider { ... }
class OpenAIProvider implements LLMProvider { ... }

// Context uses strategy via interface
class TicketService {
  async generateTicket(input: TicketInput, provider: LLMProvider) {
    // Doesn't know or care which provider
    return provider.generate(prompt);
  }
}
```

**Why?**
- Add new providers without changing existing code
- Test with mock providers
- Runtime provider switching

### 2. Factory Pattern (Provider Creation)

```typescript
// Single place to create providers
const provider = LLMFactory.create('claude', { apiKey: '...' });

// Or from environment
const provider = LLMFactory.createFromEnv('openai');

// Or get the default
const provider = LLMFactory.getDefault();
```

**Why?**
- Centralized creation logic
- Caching/singleton management
- Configuration validation

### 3. Separation of Concerns

```
src/
├── components/     # UI only - no business logic
├── hooks/          # State management - connects UI to services
├── services/       # Business logic - provider agnostic
├── prompts/        # Prompt engineering - versioned, testable
└── types/          # Shared type definitions
```

## Adding a New LLM Provider

1. Create the provider class:
```typescript
// src/services/llm/providers/GeminiProvider.ts
export class GeminiProvider implements LLMProvider {
  async complete(messages, options) {
    // Implement Gemini-specific API call
  }
}
```

2. Register in factory:
```typescript
// src/services/llm/LLMFactory.ts
case LLM_PROVIDERS.GEMINI:
  return new GeminiProvider(config);
```

3. Add environment config:
```env
GOOGLE_AI_API_KEY=your-key
GEMINI_MODEL=gemini-pro
```

Done! The rest of the app automatically supports Gemini.

## Security Model

```
Browser                    Your Server              LLM Provider
   │                           │                        │
   │ POST /api/tickets/generate│                        │
   │──────────────────────────▶│                        │
   │    (no API key)           │                        │
   │                           │ POST /v1/messages      │
   │                           │───────────────────────▶│
   │                           │  (with API key)        │
   │                           │◀───────────────────────│
   │◀──────────────────────────│                        │
   │                           │                        │
```

API keys never leave your server. Never exposed to browser.
