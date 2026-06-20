class SchemaIntelligenceEngine {
  static parseSQLSchema(sql) {
    const schema = {};
    
    // Match CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?|(\w+))\s*\(([\s\S]*?)\);?/gi;
    let match;
    
    while ((match = createTableRegex.exec(sql)) !== null) {
      const tableName = match[1] || match[2];
      const columnsPart = match[3];
      
      schema[tableName] = {
        columns: [],
        primaryKeys: [],
        foreignKeys: []
      };
      
      // Split columns and constraints
      const columnDefinitions = this.splitColumnsAndConstraints(columnsPart);
      
      for (const definition of columnDefinitions) {
        const trimmedDef = definition.trim();
        
        // Check for PRIMARY KEY constraint
        if (trimmedDef.toUpperCase().startsWith('PRIMARY KEY')) {
          const pkMatch = trimmedDef.match(/PRIMARY\s+KEY\s*(?:\((.*?)\))?/i);
          if (pkMatch && pkMatch[1]) {
            const pkColumns = pkMatch[1].split(',').map(col => col.trim().replace(/`/g, ''));
            schema[tableName].primaryKeys.push(...pkColumns);
          }
        }
        // Check for FOREIGN KEY constraint
        else if (trimmedDef.toUpperCase().startsWith('FOREIGN KEY')) {
          const fkMatch = trimmedDef.match(/FOREIGN\s+KEY\s*\((.*?)\)\s*REFERENCES\s*(?:`?(\w+)`?|(\w+))\s*\((.*?)\)/i);
          if (fkMatch) {
            schema[tableName].foreignKeys.push({
              column: fkMatch[1].trim().replace(/`/g, ''),
              referencedTable: fkMatch[2] || fkMatch[3],
              referencedColumn: fkMatch[4].trim().replace(/`/g, '')
            });
          }
        }
        // It's a column definition
        else if (trimmedDef) {
          const column = this.parseColumnDefinition(trimmedDef);
          if (column) {
            schema[tableName].columns.push(column);
            if (column.primaryKey) {
              schema[tableName].primaryKeys.push(column.name);
            }
          }
        }
      }
    }
    
    return schema;
  }
  
  static splitColumnsAndConstraints(part) {
    const parts = [];
    let current = '';
    let parenthesesCount = 0;
    
    for (const char of part) {
      if (char === '(') parenthesesCount++;
      if (char === ')') parenthesesCount--;
      
      if (char === ',' && parenthesesCount === 0) {
        if (current.trim()) parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) parts.push(current.trim());
    return parts;
  }
  
  static parseColumnDefinition(definition) {
    // Match column name, type, and constraints
    const match = definition.match(/^(\w+|`\w+`)\s+([\w\(\),\s]+?)(?:\s+(.*))?$/i);
    if (!match) return null;
    
    const name = match[1].replace(/`/g, '');
    const type = match[2].trim();
    const constraints = match[3] || '';
    
    const column = {
      name,
      type,
      nullable: !constraints.toUpperCase().includes('NOT NULL'),
      primaryKey: constraints.toUpperCase().includes('PRIMARY KEY'),
      autoIncrement: constraints.toUpperCase().includes('AUTO_INCREMENT') || 
                     constraints.toUpperCase().includes('SERIAL') ||
                     constraints.toUpperCase().includes('IDENTITY')
    };
    
    return column;
  }
  
  static generateSchemaKnowledgeGraph(schema) {
    const nodes = [];
    const edges = [];
    
    // Create nodes for tables
    for (const [tableName, tableData] of Object.entries(schema)) {
      nodes.push({
        id: tableName,
        label: tableName,
        type: 'table',
        columns: tableData.columns
      });
      
      // Create edges for foreign keys
      for (const fk of tableData.foreignKeys || []) {
        edges.push({
          from: tableName,
          to: fk.referencedTable,
          label: `${fk.column} → ${fk.referencedColumn}`,
          type: 'foreign_key'
        });
      }
    }
    
    return { nodes, edges };
  }
}

module.exports = SchemaIntelligenceEngine;
