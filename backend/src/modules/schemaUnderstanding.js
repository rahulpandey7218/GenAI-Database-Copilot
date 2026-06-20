const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();

class SchemaUnderstanding {
  static async getMySQLSchema(config) {
    const connection = await mysql.createConnection(config);
    try {
      const [tables] = await connection.execute('SHOW TABLES');
      const schema = {};
      
      for (const table of tables) {
        const tableName = Object.values(table)[0];
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        const [indexes] = await connection.execute(`SHOW INDEX FROM ${tableName}`);
        const [foreignKeys] = await connection.execute(
          `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
          [tableName]
        );
        
        schema[tableName] = {
          columns: columns.map(col => ({
            name: col.Field,
            type: col.Type,
            nullable: col.Null === 'YES',
            key: col.Key,
            default: col.Default
          })),
          indexes: indexes.map(idx => ({
            name: idx.Key_name,
            column: idx.Column_name,
            unique: idx.Non_unique === 0
          })),
          foreignKeys: foreignKeys.map(fk => ({
            constraint: fk.CONSTRAINT_NAME,
            column: fk.COLUMN_NAME,
            referencedTable: fk.REFERENCED_TABLE_NAME,
            referencedColumn: fk.REFERENCED_COLUMN_NAME
          }))
        };
      }
      return schema;
    } finally {
      await connection.end();
    }
  }

  static async getPostgreSQLSchema(config) {
    const pool = new Pool(config);
    try {
      const client = await pool.connect();
      const tablesResult = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      const schema = {};
      
      for (const table of tablesResult.rows) {
        const tableName = table.table_name;
        const columnsResult = await client.query(
          `SELECT column_name, data_type, is_nullable, column_default 
           FROM information_schema.columns 
           WHERE table_name = $1`,
          [tableName]
        );
        
        schema[tableName] = {
          columns: columnsResult.rows.map(col => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === 'YES',
            default: col.column_default
          }))
        };
      }
      client.release();
      return schema;
    } finally {
      await pool.end();
    }
  }

  static async getSQLiteSchema(config) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(config.path, (err) => {
        if (err) reject(err);
      });
      
      const schema = {};
      
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        const processTable = (index) => {
          if (index >= tables.length) {
            db.close();
            resolve(schema);
            return;
          }
          
          const tableName = tables[index].name;
          db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
              db.close();
              reject(err);
              return;
            }
            
            schema[tableName] = {
              columns: columns.map(col => ({
                name: col.name,
                type: col.type,
                nullable: col.notnull === 0,
                primaryKey: col.pk === 1
              }))
            };
            
            processTable(index + 1);
          });
        };
        
        processTable(0);
      });
    });
  }

  static async getSchema(dbType, config) {
    switch (dbType) {
      case 'mysql':
        return await this.getMySQLSchema(config);
      case 'postgresql':
        return await this.getPostgreSQLSchema(config);
      case 'sqlite':
        return await this.getSQLiteSchema(config);
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }
}

module.exports = SchemaUnderstanding;
