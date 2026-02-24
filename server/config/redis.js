const Redis = require('ioredis');
const { logger } = require('./logger');

let redis;

const connectRedis = () => {
    try {
        redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            retryStrategy: (times) => {
                if (times > 3) {
                    logger.warn('⚠️ Redis connection failed, running without Redis');
                    return null;
                }
                return Math.min(times * 200, 2000);
            },
            maxRetriesPerRequest: 3,
        });

        redis.on('connect', () => {
            logger.info('✅ Redis connected');
        });

        redis.on('error', (err) => {
            logger.error(`❌ Redis error: ${err.message}`);
        });
    } catch (error) {
        logger.warn('⚠️ Redis not available, running without caching');
        redis = null;
    }
};

const getRedis = () => redis;

module.exports = { connectRedis, getRedis };
