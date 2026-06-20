const express = require('express');
const multer = require('multer');
const SchemaUnderstanding = require('../modules/schemaUnderstanding');
const QueryGenerator = require('../modules/queryGenerator');
const SecurityLayer = require('../modules/securityLayer');
const demoDatabases = require('../modules/demoDatabases');
const SchemaIntelligenceEngine = require('../modules/schemaIntelligenceEngine');
const cacheService = require('../services/cacheService');

console.log('Creating API router, demoDatabases keys:', Object.keys(demoDatabases));
const router = express.Router();
const queryGenerator = new QueryGenerator(process.env.GOOGLE_API_KEY);

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// In-memory session storage
let activeSession = {
  schema: null,
  schemaDetails: null,
  chatHistory: []
};

// In-memory history storage (replace with MongoDB in production)
let queryHistory = [];

// Get demo databases
router.get('/demo-databases', async (req, res) => {
  console.log('Got request for /demo-databases');
  const cacheKey = 'demo-databases';
  const cached = await cacheService.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }
  
  const databases = Object.entries(demoDatabases).map(([key, db]) => ({
    id: key,
    name: db.name
  }));
  const response = { databases };
  await cacheService.set(cacheKey, response, 300);
  res.json(response);
});

// Get demo database details
router.get('/demo-database/:id', async (req, res) => {
  const cacheKey = `demo-database-${req.params.id}`;
  const cached = await cacheService.get(cacheKey);
  
  const db = demoDatabases[req.params.id];
  if (db) {
    const tableCount = Object.keys(db.schema).length;
    const columnCount = Object.values(db.schema).reduce((sum, table) => sum + table.columns.length, 0);
    const response = {
      schema: db.schema,
      name: db.name,
      suggestedPrompts: db.suggestedPrompts || [],
      relationships: db.relationships || [],
      tableCount,
      columnCount,
      primaryKeys: countPrimaryKeys(db.schema),
      foreignKeys: countForeignKeys(db.schema)
    };
    
    // Set active session
    activeSession = {
      schema: db.schema,
      schemaDetails: db,
      chatHistory: []
    };

    await cacheService.set(cacheKey, response, 300);
    res.json(response);
  } else {
    res.status(404).json({ error: 'Demo database not found' });
  }
});

// Helper functions
function countPrimaryKeys(schema) {
  let count = 0;
  for (const tableName in schema) {
    for (const col of schema[tableName].columns) {
      if (col.primaryKey) count++;
    }
  }
  return count;
}

function countForeignKeys(schema) {
  // For now, return 0; we can improve this later
  return 0;
}

// Parse SQL schema with optional file upload
router.post('/parse-schema', upload.single('schemaFile'), (req, res) => {
  try {
    let sqlContent = req.body.sql || '';
    
    // Read uploaded file content if present
    if (req.file) {
      const fileContent = req.file.buffer.toString('utf8');
      sqlContent = sqlContent + '\n' + fileContent;
    }
    
    const schema = SchemaIntelligenceEngine.parseSQLSchema(sqlContent);
    const knowledgeGraph = SchemaIntelligenceEngine.generateSchemaKnowledgeGraph(schema);
    
    const tableCount = Object.keys(schema).length;
    const columnCount = Object.values(schema).reduce((sum, table) => sum + table.columns.length, 0);
    const primaryKeyCount = countPrimaryKeys(schema);
    const foreignKeyCount = countForeignKeys(schema);

    // Set active session
    activeSession = {
      schema,
      schemaDetails: {
        schema,
        tableCount,
        columnCount,
        primaryKeys: primaryKeyCount,
        foreignKeys: foreignKeyCount,
        relationships: knowledgeGraph
      },
      chatHistory: []
    };

    res.json({
      schema,
      knowledgeGraph,
      tableCount,
      columnCount,
      primaryKeys: primaryKeyCount,
      foreignKeys: foreignKeyCount
    });
  } catch (error) {
    console.error('Error parsing schema:', error);
    res.status(500).json({ error: error.message });
  }
});

// Chat with AI Database Copilot
router.post('/chat', async (req, res) => {
  try {
    const { prompt, messages } = req.body;
    const schema = activeSession.schema;

    if (!schema) {
      return res.status(400).json({ error: 'No active database session. Please upload a schema or select a demo database first.' });
    }

    // Add user message to chat history
    if (messages) {
      activeSession.chatHistory = [...activeSession.chatHistory, ...messages];
    }
    activeSession.chatHistory.push({ role: 'user', content: prompt });

    const assistantResponse = await queryGenerator.chat(prompt, activeSession.chatHistory.slice(0, -1), schema);
    activeSession.chatHistory.push({ role: 'assistant', content: assistantResponse });

    res.json({ response: assistantResponse, chatHistory: activeSession.chatHistory });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/schema', async (req, res) => {
  try {
    const { dbType, config } = req.body;
    const schema = await SchemaUnderstanding.getSchema(dbType, config);
    
    // Set active session
    activeSession = {
      schema,
      schemaDetails: {
        schema,
        tableCount: Object.keys(schema).length,
        columnCount: Object.values(schema).reduce((sum, table) => sum + table.columns.length, 0),
        primaryKeys: countPrimaryKeys(schema),
        foreignKeys: countForeignKeys(schema)
      },
      chatHistory: []
    };

    res.json({
      schema,
      tableCount: Object.keys(schema).length,
      columnCount: Object.values(schema).reduce((sum, table) => sum + table.columns.length, 0),
      primaryKeys: countPrimaryKeys(schema),
      foreignKeys: countForeignKeys(schema)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { prompt, schema, dbType } = req.body;
    const currentSchema = schema || activeSession.schema;
    
    if (!currentSchema) {
      return res.status(400).json({ error: 'No active database session. Please upload a schema or select a demo database first.' });
    }

    const queries = await queryGenerator.generateMultipleQueries(prompt, currentSchema, dbType);
    const primaryQuery = queries[0];
    const explanation = await queryGenerator.explainQuery(primaryQuery.sql);
    const security = SecurityLayer.validateQuery(primaryQuery.sql);
    
    // Add to history
    queryHistory.push({
      prompt,
      sql: primaryQuery.sql,
      queryType: security.classification.operation,
      riskScore: security.riskScore,
      timestamp: new Date().toISOString()
    });
    
    res.json({ queries, explanation, security });
  } catch (error) {
    console.error('Error generating queries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Translate SQL between databases
router.post('/translate', async (req, res) => {
  try {
    const { sql, sourceDb, targetDb } = req.body;
    const translatedSQL = await queryGenerator.translateSQL(sql, sourceDb, targetDb);
    res.json({ sql: translatedSQL });
  } catch (error) {
    console.error('Error translating SQL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate database documentation
router.post('/document', async (req, res) => {
  try {
    const { schema } = req.body;
    const currentSchema = schema || activeSession.schema;
    
    if (!currentSchema) {
      return res.status(400).json({ error: 'No active database session. Please upload a schema or select a demo database first.' });
    }

    const documentation = await queryGenerator.generateDocumentation(currentSchema);
    res.json({ documentation });
  } catch (error) {
    console.error('Error generating documentation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze database health
router.post('/analyze-health', async (req, res) => {
  try {
    const { schema } = req.body;
    const currentSchema = schema || activeSession.schema;
    
    if (!currentSchema) {
      return res.status(400).json({ error: 'No active database session. Please upload a schema or select a demo database first.' });
    }

    const health = await queryGenerator.analyzeDatabaseHealth(currentSchema);
    res.json({ health });
  } catch (error) {
    console.error('Error analyzing database health:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get query history
router.get('/history', (req, res) => {
  res.json({ history: queryHistory });
});

router.post('/validate', (req, res) => {
  try {
    const { sql } = req.body;
    const validation = SecurityLayer.validateQuery(sql);
    res.json(validation);
  } catch (error) {
    console.error('Error validating query:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
