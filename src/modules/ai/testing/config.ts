import dotenv from 'dotenv';

dotenv.config();

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
  },
  testing: {
    maxConcurrentTests: parseInt(process.env.MAX_CONCURRENT_TESTS || '5', 10),
    rateLimitDelay: parseInt(process.env.RATE_LIMIT_DELAY || '1000', 10), // milliseconds
  },
};

if (!config.openai.apiKey) {
  throw new Error('OPENAI_API_KEY is not set in the environment variables');
}

if (!config.anthropic.apiKey) {
  throw new Error('ANTHROPIC_API_KEY is not set in the environment variables');
}