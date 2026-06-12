const Redis = require("ioredis");

// Redis client for pub/sub (optional, for scaling)
// If Redis is not available, the app will still work without it
let redisClient = null;
let redisSubscriber = null;
let redisPublisher = null;

const initRedis = async () => {
  // Redis is OPTIONAL - only needed for horizontal scaling (multiple servers)
  // For single-server deployments, you don't need Redis at all
  
  // Check if Redis is explicitly disabled via environment variable
  if (process.env.REDIS_ENABLED === 'false') {
    console.log("ℹ️ Redis disabled via environment variable");
    return { redisClient: null, redisSubscriber: null, redisPublisher: null };
  }

  // Don't even try to connect if Redis is not needed
  // Just return null clients
  console.log("ℹ️ Redis not available - app running without it (this is fine)");
  return { redisClient: null, redisSubscriber: null, redisPublisher: null };
};

const getRedis = () => {
  return { redisClient, redisSubscriber, redisPublisher };
};

module.exports = { initRedis, getRedis };

