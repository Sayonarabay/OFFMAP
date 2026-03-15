module.exports={
  models:{personalization:'claude-sonnet-4'},
  maxTokens:{personalization:300},
  kbPath:process.env.KB_PATH||'./kb',
  apiTimeout:30000,
  cache:{ttl:3600},
  env:process.env.NODE_ENV||'development'
};
