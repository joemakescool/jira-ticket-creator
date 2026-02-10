# JIRA Ticket Creator

A local web app that uses AI to generate well-structured JIRA tickets from plain-text descriptions. You describe what needs to be done in natural language, pick an LLM provider, and the app produces a formatted ticket with title, type, priority, labels, and a full description — ready to copy into JIRA.

It runs entirely on your machine: a React frontend served by an Express backend that proxies requests to whichever LLM provider you configure. API keys never leave the server.

## Features

- **Two-step workflow** — Describe your task, then review and refine the generated ticket
- **Multiple LLM providers** — Claude, OpenAI, or Ollama (local). Switch between them at runtime
- **Refinement styles** — Make generated content more concise, detailed, technical, etc.
- **Draft persistence** — Work-in-progress is saved to localStorage automatically
- **Keyboard shortcuts** — Ctrl+Enter to generate, Ctrl+S to save draft, Ctrl+K for shortcut reference
- **Dark mode** — Toggle between light and dark themes
- **Copy as plain text or Markdown** — One-click export for pasting into JIRA or docs

## Getting Started

### Prerequisites

- Node.js 18+
- At least one LLM provider API key (or a local Ollama instance)

### Install

```bash
git clone <repo-url>
cd jira-ticket-creator
npm install
```

### Configure

```bash
cp .env.example .env
```

Open `.env` and add your API keys:

```env
# Add the providers you want to use
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Or use Ollama locally (no key needed)
# OLLAMA_HOST=http://localhost:11434
# OLLAMA_MODEL=llama3

# Which provider to use by default
DEFAULT_LLM_PROVIDER=claude

# Server
PORT=3001
```

### Run (Development)

```bash
npm run dev
```

This starts both the frontend (port 3000) and backend (port 3001) with hot reload.

### Build & Run (Production)

```bash
npm run build
npm start
```

The Express server serves the built frontend and API on a single port (default 3001).

## Auto-Start on Windows

The project includes two scripts that let it run automatically when you log in:

| File | Purpose |
|------|---------|
| `start-jira-creator.bat` | Builds (if needed) and starts the production server |
| `start-jira-creator-hidden.vbs` | Launches the `.bat` in a hidden window (no terminal flash) |

To enable auto-start:

1. Build the project first: `npm run build`
2. Press `Win + R`, type `shell:startup`, and press Enter
3. Create a shortcut to `start-jira-creator-hidden.vbs` in the Startup folder
4. The app will now start silently on login and be available at `http://localhost:5050`

To stop it, find the `node` process in Task Manager or run `taskkill /f /im node.exe`.

## Architecture

```
jira-ticket-creator/
├── src/                          # Frontend (React + TypeScript)
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component, wraps ThemeProvider
│   ├── index.css                 # Global styles + custom Tailwind utilities
│   ├── components/
│   │   ├── ui/
│   │   │   └── Toast.tsx         # Toast notification
│   │   └── JiraTicketCreator/
│   │       ├── index.tsx         # Main orchestrator (state, handlers, layout)
│   │       ├── types.ts          # Component-local types (TicketFormData, AppStep)
│   │       ├── constants.ts      # UI config (ticket types, priorities, templates)
│   │       ├── InputView.tsx     # Step 1: describe your task
│   │       ├── ReviewView.tsx    # Step 2: review, edit, refine, copy
│   │       ├── DescriptionEditor.tsx
│   │       ├── TicketTypeSelector.tsx
│   │       ├── PrioritySelector.tsx
│   │       ├── ProviderSelector.tsx
│   │       ├── TemplateSelector.tsx
│   │       ├── WritingStyleSelector.tsx
│   │       ├── AdvancedOptions.tsx
│   │       ├── StepIndicator.tsx
│   │       ├── KeyboardShortcutsModal.tsx
│   │       └── hooks/
│   │           └── useDraft.ts   # localStorage draft persistence
│   ├── hooks/
│   │   └── useTicket.ts          # Generate / refine / copy ticket logic
│   ├── contexts/
│   │   └── ThemeContext.tsx       # Dark mode toggle
│   ├── types/
│   │   └── ticket.ts             # Shared domain types (single source of truth)
│   ├── prompts/
│   │   └── ticketPrompts.ts      # LLM prompt templates
│   └── services/
│       ├── llm/
│       │   ├── LLMProvider.ts    # Strategy interface
│       │   ├── LLMFactory.ts     # Factory (creates providers from env config)
│       │   ├── index.ts          # Barrel export
│       │   ├── utils/
│       │   │   └── fetchWithTimeout.ts
│       │   └── providers/
│       │       ├── ClaudeProvider.ts
│       │       ├── OpenAIProvider.ts
│       │       └── OllamaProvider.ts
│       └── ticket/
│           └── TicketService.ts  # Core generation logic (provider-agnostic)
│
├── server/                       # Backend (Express)
│   ├── index.ts                  # Server setup, middleware, static serving
│   ├── routes/
│   │   ├── index.ts              # Route aggregator
│   │   └── tickets.ts            # POST /api/tickets/generate, /refine
│   ├── helpers/
│   │   └── provider.ts           # Resolves provider name → instance
│   ├── middleware/
│   │   └── validate.ts           # Zod validation middleware
│   ├── validation/
│   │   └── schemas.ts            # Zod schemas (mirrors TypeScript types)
│   └── lib/
│       ├── logger.ts             # Pino structured logging
│       └── errors.ts             # ApiError class
│
├── start-jira-creator.bat        # Windows production launcher
├── start-jira-creator-hidden.vbs # Hidden-window wrapper for startup
└── .env.example                  # Environment variable template
```

### Key Design Patterns

**Strategy Pattern (LLM Providers)** — All providers implement the same `LLMProvider` interface. The `TicketService` calls `provider.complete()` without knowing which LLM is behind it. Swapping providers is a one-line change.

**Factory Pattern (Provider Creation)** — `LLMFactory` reads environment variables and instantiates the correct provider. The rest of the app just calls `LLMFactory.create('claude')`.

**Separation of Concerns** — Components handle UI only. Business logic lives in services. State management lives in hooks. Prompt templates are isolated for easy iteration.

### Security Model

```
Browser  ──▶  Express Server  ──▶  LLM Provider
          (no API keys)        (API keys here)
```

The frontend never sees API keys. All LLM calls are proxied through the Express backend, which also applies rate limiting and request validation.

## Supported Providers

| Provider | Model | Status |
|----------|-------|--------|
| Anthropic Claude | claude-sonnet-4-20250514 | Ready |
| OpenAI | gpt-4o | Ready |
| Ollama (local) | llama3, mistral, etc. | Ready |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend with hot reload |
| `npm run build` | Build both client and server for production |
| `npm start` | Run the production server |
| `npm run typecheck` | Run TypeScript type checking |

## License

MIT
