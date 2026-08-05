/**
 * Application Logger
 *
 * Structured logging with pino for better observability.
 * Uses pino-pretty in development for readable output.
 */

import pino from 'pino';

const isTest = process.env.NODE_ENV === 'test';
const isDev = !isTest && process.env.NODE_ENV !== 'production';

// pino-pretty runs in a worker thread. Under test that worker keeps the process
// alive and interleaves output with the test reporter, so use plain pino there
// and stay silent unless LOG_LEVEL is set explicitly.
export const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV || 'development',
  },
});

// Create child loggers for different modules
export const createLogger = (module: string) => logger.child({ module });

// Pre-created loggers for common modules
export const serverLogger = createLogger('server');
export const llmLogger = createLogger('llm');
export const ticketLogger = createLogger('ticket');
