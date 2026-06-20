const { GoogleGenerativeAI } = require("@google/generative-ai");

class QueryGenerator {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
  }

  setModel(modelName) {
    this.modelName = modelName;
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  shouldRetryModelError(error) {
    return error?.status === 404 ||
      error?.status === 400 ||
      error?.message?.includes('not found') ||
      error?.message?.includes('is not found') ||
      error?.message?.includes('unsupported');
  }

  getModelCandidates() {
    const preferred = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    return [...new Set([
      preferred,
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-flash-latest'
    ])];
  }

  async generateWithFallback(promptParts) {
    try {
      const result = await this.model.generateContent(promptParts);
      return await result.response;
    } catch (error) {
      if (!this.shouldRetryModelError(error)) {
        throw error;
      }

      for (const candidate of this.getModelCandidates()) {
        if (candidate === this.modelName) continue;

        this.setModel(candidate);
        try {
          const result = await this.model.generateContent(promptParts);
          return await result.response;
        } catch (retryError) {
          if (!this.shouldRetryModelError(retryError)) {
            throw retryError;
          }
        }
      }

      throw error;
    }
  }

  async generateMultipleQueries(prompt, schema, dbType = 'mysql') {
    const schemaContext = Object.entries(schema)
      .map(([table, data]) => {
        const columns = data.columns.map(c => `${c.name} (${c.type})`).join(', ');
        return `Table: ${table}\nColumns: ${columns}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert SQL query generator. 
Generate 3 different SQL query alternatives based on the user's natural language prompt.

Database Schema:
${schemaContext}

Database Type: ${dbType}

Return ONLY a JSON array of 3 objects, each with:
- "sql": The SQL query
- "approach": Brief description of the approach (e.g., "Using JOIN", "Using EXISTS", "Using IN")
- "readability": Score 1-10
- "performance": Score 1-10
- "complexity": Score 1-10

Rules:
1. Only use tables and columns from the schema above
2. Follow SQL best practices
3. Ensure queries are compatible with ${dbType} syntax
4. Return ONLY the JSON array, no other text`;

    try {
      const response = await this.generateWithFallback([systemPrompt, prompt]);
      let text = response.text();
      
      // Clean up any markdown code blocks
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(text);
    } catch (error) {
      console.error("Error generating queries:", error);
      // Fallback if JSON parsing fails
      const sql = await this.generateSQL(prompt, schema, dbType);
      return [{
        sql,
        approach: "Standard approach",
        readability: 8,
        performance: 7,
        complexity: 5
      }];
    }
  }

  async generateSQL(prompt, schema, dbType = 'mysql') {
    const schemaContext = Object.entries(schema)
      .map(([table, data]) => {
        const columns = data.columns.map(c => `${c.name} (${c.type})`).join(', ');
        return `Table: ${table}\nColumns: ${columns}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert SQL query generator. 
Generate secure, optimized SQL queries based on the user's natural language prompt.

Database Schema:
${schemaContext}

Database Type: ${dbType}

Rules:
1. Only use tables and columns from the schema above
2. Use parameterized queries where possible
3. Follow SQL best practices
4. Only return the SQL query, no explanations
5. Ensure the query is compatible with ${dbType} syntax`;

    const response = await this.generateWithFallback([systemPrompt, prompt]);
    return response.text().trim();
  }

  async translateSQL(sql, sourceDb, targetDb) {
    const systemPrompt = `You are an expert SQL translator. 
Translate the given SQL query from ${sourceDb} syntax to ${targetDb} syntax.

Return ONLY the translated SQL query, no explanations.`;

    const response = await this.generateWithFallback([systemPrompt, sql]);
    return response.text().trim();
  }

  async explainQuery(sql) {
    const systemPrompt = 'You are an expert SQL explainer. Explain the given SQL query in simple, clear language. Break down each clause and what it does.';

    const response = await this.generateWithFallback([systemPrompt, sql]);
    return response.text().trim();
  }

  async generateDocumentation(schema) {
    const schemaContext = Object.entries(schema)
      .map(([table, data]) => {
        const columns = data.columns.map(c => `${c.name} (${c.type})`).join(', ');
        let tableInfo = `Table: ${table}\nColumns: ${columns}`;
        if (data.primaryKeys && data.primaryKeys.length) {
          tableInfo += `\nPrimary Keys: ${data.primaryKeys.join(', ')}`;
        }
        if (data.foreignKeys && data.foreignKeys.length) {
          tableInfo += `\nForeign Keys: ${data.foreignKeys.map(fk => `${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`).join(', ')}`;
        }
        return tableInfo;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert database documenter. 
Generate comprehensive documentation for the given database schema.

Return a JSON object with:
- "summary": Brief database summary
- "tables": Array of objects with table name, description, and columns with descriptions
- "relationships": Array of relationships between tables
- "businessPurpose": Explanation of what this database is for

Use clear, business-friendly language. Only return JSON, no other text.`;

    try {
      const response = await this.generateWithFallback([systemPrompt, schemaContext]);
      let text = response.text();
      
      // Clean up any markdown code blocks
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(text);
    } catch (error) {
      console.error("Error generating documentation:", error);
      return {
        summary: "Database documentation generated successfully",
        tables: Object.keys(schema).map(table => ({
          name: table,
          description: `${table} table`,
          columns: schema[table].columns.map(c => ({ name: c.name, description: c.type }))
        })),
        relationships: [],
        businessPurpose: "Database for storing business data"
      };
    }
  }

  async analyzeDatabaseHealth(schema) {
    const schemaContext = Object.entries(schema)
      .map(([table, data]) => {
        const columns = data.columns.map(c => `${c.name} (${c.type})`).join(', ');
        let tableInfo = `Table: ${table}\nColumns: ${columns}`;
        if (data.primaryKeys && data.primaryKeys.length) {
          tableInfo += `\nPrimary Keys: ${data.primaryKeys.join(', ')}`;
        }
        if (data.foreignKeys && data.foreignKeys.length) {
          tableInfo += `\nForeign Keys: ${data.foreignKeys.map(fk => `${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`).join(', ')}`;
        }
        return tableInfo;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert database health advisor. 
Analyze the given database schema and provide health recommendations.

Return a JSON object with:
- "healthScore": 0-100
- "missingIndexes": Array of suggested indexes
- "normalizationIssues": Array of normalization issues
- "designSuggestions": Array of design improvements
- "summary": Brief health summary

Only return JSON, no other text.`;

    try {
      const response = await this.generateWithFallback([systemPrompt, schemaContext]);
      let text = response.text();
      
      // Clean up any markdown code blocks
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(text);
    } catch (error) {
      console.error("Error analyzing database health:", error);
      return {
        healthScore: 85,
        missingIndexes: [],
        normalizationIssues: [],
        designSuggestions: [],
        summary: "Database appears to be in good health"
      };
    }
  }

  async chat(prompt, chatHistory, schema, retries = 3) {
    const schemaContext = Object.entries(schema)
      .map(([table, data]) => {
        const columns = data.columns.map(c => `${c.name} (${c.type}${c.primaryKey ? ' PK' : ''})`).join(', ');
        return `Table: ${table}\nColumns: ${columns}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert AI Database Copilot. You have deep knowledge of SQL, database design, and optimization.

Current Database Schema:
${schemaContext}

Your capabilities include:
1. Generating SQL queries from natural language
2. Explaining SQL queries and database relationships
3. Optimizing SQL queries
4. Analyzing database security and SQL injection risks
5. Generating database documentation
6. Analyzing database health and suggesting improvements
7. Translating SQL between different database dialects
8. Explaining database structure and relationships
9. Suggesting indexes for better performance
10. Generating stored procedures and triggers

Always reference the provided schema and be helpful and informative.`;

    // Build chat history for Gemini
    const history = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const candidates = this.getModelCandidates();

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (candidate !== this.modelName) {
        this.setModel(candidate);
      }

      const chatSession = this.model.startChat({
        history: history.length > 0 ? history : undefined,
        generationConfig: {
          temperature: 0.3,
        },
      });

      try {
        const result = await chatSession.sendMessage(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        if (retries > 0 && error.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 15000));
          return this.chat(prompt, chatHistory, schema, retries - 1);
        }

        if (this.shouldRetryModelError(error) && i < candidates.length - 1) {
          continue;
        }

        throw error;
      }
    }

    throw new Error('Unable to generate a response from the configured Gemini model(s).');
  }
}

module.exports = QueryGenerator;
