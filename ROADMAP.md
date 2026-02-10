# Roadmap

Planned improvements for future development.

## Favicon
Replace the blank placeholder with a proper SVG ticket icon so the browser tab is identifiable.

## `.gitattributes`
Add a `.gitattributes` file to enforce consistent line endings across Windows/Mac/Linux contributors.

## Environment Validation
Validate required environment variables (`ANTHROPIC_API_KEY`, `DEFAULT_LLM_PROVIDER`, etc.) on server startup. Fail fast with a clear error message instead of crashing on the first API request.

## Health Check Endpoint
Add `GET /api/health` that returns server status, uptime, and which providers are configured. Useful for verifying the app is running after auto-start on boot.

## React Error Boundary
Wrap the app in an error boundary component so render crashes show a recovery UI ("Something went wrong — click to reload") instead of a blank white screen.

## ESLint
Set up ESLint with a proper config file. The packages were removed during cleanup since no config existed — add them back with a working `eslint.config.js` and a `lint` script.

## Tests
Add core test coverage using Vitest:
- Ticket generation (prompt building, response parsing)
- Refinement (style application)
- Provider switching (factory creates correct provider)
- Zod schema validation (valid/invalid payloads)

## PWA Support
Add a web app manifest and service worker so the app can be "installed" from the browser as a standalone window — no address bar, feels like a native desktop app. A natural fit since it already auto-starts locally.
