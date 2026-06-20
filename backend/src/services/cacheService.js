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
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error);
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
      this.isConnected = false;
      console.error('❌ Failed to connect to Redis:', error);
      return null;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    if (!this.isConnected) return null;
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
    if (!this.isConnected) return null;
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  }

  async clear() {
    if (!this.isConnected) return null;
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
