const { Queue, Worker } = require('bullmq');
const cacheService = require('./cacheService');
const queryGenerator = require('../modules/queryGenerator');

let connection = null;
let schemaAnalysisQueue = null;
let documentationGenerationQueue = null;
let healthAnalysisQueue = null;
let schemaAnalysisWorker = null;
let documentationGenerationWorker = null;
let healthAnalysisWorker = null;

async function initJobQueues() {
  try {
    connection = cacheService.getRedis();
    if (!connection || !cacheService.isConnected) {
      console.warn('⚠️ Redis is not available, skipping job queue initialization');
      return;
    }

    if (!cacheService.isRedisCompatibleForJobs()) {
      console.warn(
        `⚠️ Skipping job queue initialization because Redis ${cacheService.redisVersion || 'unknown version'} is too old for BullMQ (requires >= 5.0.0).`
      );
      return;
    }

    schemaAnalysisQueue = new Queue('schema-analysis', { connection });
    documentationGenerationQueue = new Queue('documentation-generation', { connection });
    healthAnalysisQueue = new Queue('health-analysis', { connection });

    console.log('✅ Job queues initialized');

    // Initialize workers
    await initWorkers();
  } catch (error) {
    if (error.message?.includes('Redis version needs to be greater or equal than 5.0.0')) {
      console.warn(
        '⚠️ Skipping job queue initialization because the configured Redis server is older than BullMQ requires.'
      );
      return;
    }

    console.error('❌ Failed to initialize job queues:', error);
  }
}

async function initWorkers() {
  try {
    if (!connection || !cacheService.isConnected || !cacheService.isRedisCompatibleForJobs()) {
      console.warn('⚠️ Redis connection unavailable or incompatible, skipping worker initialization');
      return;
    }

    schemaAnalysisWorker = new Worker('schema-analysis', async (job) => {
      const { schemaContent, sessionId } = job.data;
      console.log(`🔄 Processing schema analysis job: ${job.id}`);
      
      const result = await queryGenerator.analyzeSchema(schemaContent);
      
      await cacheService.set(`schema-result:${sessionId}`, result, 3600);
      return result;
    }, { connection });

    schemaAnalysisWorker.on('completed', (job) => {
      console.log(`✅ Schema analysis job ${job.id} completed`);
    });

    schemaAnalysisWorker.on('failed', (job, err) => {
      console.error(`❌ Schema analysis job ${job.id} failed:`, err);
    });

    documentationGenerationWorker = new Worker('documentation-generation', async (job) => {
      const { schema, sessionId } = job.data;
      console.log(`🔄 Processing documentation job: ${job.id}`);
      
      const result = await queryGenerator.generateDocumentation(schema);
      
      await cacheService.set(`documentation-result:${sessionId}`, result, 3600);
      return result;
    }, { connection });

    documentationGenerationWorker.on('completed', (job) => {
      console.log(`✅ Documentation job ${job.id} completed`);
    });

    documentationGenerationWorker.on('failed', (job, err) => {
      console.error(`❌ Documentation job ${job.id} failed:`, err);
    });

    healthAnalysisWorker = new Worker('health-analysis', async (job) => {
      const { schema, sessionId } = job.data;
      console.log(`🔄 Processing health analysis job: ${job.id}`);
      
      const result = await queryGenerator.analyzeDatabaseHealth(schema);
      
      await cacheService.set(`health-result:${sessionId}`, result, 3600);
      return result;
    }, { connection });

    healthAnalysisWorker.on('completed', (job) => {
      console.log(`✅ Health analysis job ${job.id} completed`);
    });

    healthAnalysisWorker.on('failed', (job, err) => {
      console.error(`❌ Health analysis job ${job.id} failed:`, err);
    });

    console.log('✅ Job workers initialized');
  } catch (error) {
    console.error('❌ Failed to initialize workers:', error);
  }
}

async function addSchemaAnalysisJob(schemaContent, sessionId) {
  const job = await schemaAnalysisQueue.add('analyze', {
    schemaContent,
    sessionId
  });
  return job.id;
}

async function addDocumentationGenerationJob(schema, sessionId) {
  const job = await documentationGenerationQueue.add('generate', {
    schema,
    sessionId
  });
  return job.id;
}

async function addHealthAnalysisJob(schema, sessionId) {
  const job = await healthAnalysisQueue.add('analyze', {
    schema,
    sessionId
  });
  return job.id;
}

async function getJobStatus(queueName, jobId) {
  let queue;
  switch (queueName) {
    case 'schema-analysis':
      queue = schemaAnalysisQueue;
      break;
    case 'documentation-generation':
      queue = documentationGenerationQueue;
      break;
    case 'health-analysis':
      queue = healthAnalysisQueue;
      break;
    default:
      return null;
  }
  
  const job = await queue.getJob(jobId);
  if (!job) return null;
  
  const state = await job.getState();
  const progress = job.progress();
  const result = await job.returnvalue();
  
  return {
    state,
    progress,
    result
  };
}

module.exports = {
  initJobQueues,
  addSchemaAnalysisJob,
  addDocumentationGenerationJob,
  addHealthAnalysisJob,
  getJobStatus
};
