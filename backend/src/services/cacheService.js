const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.redisVersion = null;
  }

  parseRedisVersion(infoString) {
    const serverInfo = infoString.split(/\r?\n/);
    const versionLine = serverInfo.find((line) => line.startsWith('redis_version:'));
    return versionLine ? versionLine.split(':')[1]?.trim() || null : null;
  }

  isRedisCompatibleForJobs() {
    if (!this.redisVersion) return false;

    const [major, minor] = this.redisVersion.split('.').map(Number);
    if (Number.isNaN(major) || Number.isNaN(minor)) {
      return false;
    }

    return major > 5 || (major === 5 && minor >= 0);
  }

  async connect() {
    try {
      // If Redis env vars are not provided, skip Redis entirely
      if (!process.env.REDIS_HOST) {
        console.log('⚠️ REDIS_HOST not set. Skipping Redis connection.');
        this.redis = null;
        this.isConnected = false;
        return null;
      }

      this.redis = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),

        // Prevent endless retry loop on Render if Redis is unavailable
        maxRetriesPerRequest: 1,
        retryStrategy: () => null
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
        this.isConnected = false;
      });

      await this.redis.ping();
      const info = await this.redis.info('server');
      this.redisVersion = this.parseRedisVersion(info);
      this.isConnected = true;

      if (this.isRedisCompatibleForJobs()) {
        console.log('✅ Connected to Redis');
      } else {
        console.warn(
          `⚠️ Connected to Redis ${this.redisVersion || 'unknown version'}; BullMQ requires Redis >= 5.0.0 so background jobs will be skipped.`
        );
      }

      return this.redis;
    } catch (error) {
      this.redis = null;
      this.isConnected = false;
      console.warn('⚠️ Redis not available. Continuing without Redis.');
      return null;
    }
  }

  async get(key) {
    if (!this.isConnected || !this.redis) return null;
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    if (!this.isConnected || !this.redis) return false;
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, 'EX', ttl);
      return true;
    } catch (error) {
      console.error('❌ Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    if (!this.isConnected || !this.redis) return false;
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  }

  async clear() {
    if (!this.isConnected || !this.redis) return false;
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('❌ Cache clear error:', error);
      return false;
    }
  }

  getRedis() {
    return this.redis;
  }
}

module.exports = new CacheService();