module.exports = {
  models: {
    personalization: 'claude-sonnet-4-20250514',
    fast: 'claude-haiku-4-5-20251001',
  },
  maxTokens: {
    personalization: 3000,
    fast: 2000,
    prices: 2000,
  },
  kbPath: process.env.KB_PATH || './kb',
  apiTimeout: 60000, // 60s for MCP calls
  env: process.env.NODE_ENV || 'development',
};
