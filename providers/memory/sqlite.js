// providers/memory/sqlite.js
/**
 * SQLite 持久化记忆实现
 * 需要安装 sqlite3 依赖: npm install sqlite3
 */

const sqlite3 = require('sqlite3').verbose();
const { MemoryProvider } = require('../../core/memory');

class SQLiteMemory extends MemoryProvider {
  /**
   * @param {string} dbPath - 数据库文件路径，默认 './conversations.db'
   * @param {string} sessionId - 会话标识，默认 'default'
   */
  constructor(dbPath = './conversations.db', sessionId = 'default') {
    super();
    this.dbPath = dbPath;
    this.sessionId = sessionId;
    this.db = null;
    this._init();
  }

  _init() {
    this.db = new sqlite3.Database(this.dbPath);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_call_id TEXT,
        tool_name TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async add(role, content, metadata = {}) {
    const sessionId = metadata.sessionId || this.sessionId;
    const toolCallId = metadata.toolCallId || null;
    const toolName = metadata.toolName || null;

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO messages (session_id, role, content, tool_call_id, tool_name)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, role, content, toolCallId, toolName],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getLast(n, sessionId = null) {
    const sid = sessionId || this.sessionId;
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT role, content, tool_call_id, tool_name, timestamp
         FROM messages
         WHERE session_id = ?
         ORDER BY id DESC
         LIMIT ?`,
        [sid, n],
        (err, rows) => {
          if (err) reject(err);
          else {
            // 反转顺序，使消息按时间正序
            const messages = rows.reverse().map(row => ({
              role: row.role,
              content: row.content,
              metadata: {
                toolCallId: row.tool_call_id,
                toolName: row.tool_name,
                timestamp: row.timestamp
              }
            }));
            resolve(messages);
          }
        }
      );
    });
  }

  async getAll(sessionId = null) {
    const sid = sessionId || this.sessionId;
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT role, content, tool_call_id, tool_name, timestamp
         FROM messages
         WHERE session_id = ?
         ORDER BY id ASC`,
        [sid],
        (err, rows) => {
          if (err) reject(err);
          else {
            const messages = rows.map(row => ({
              role: row.role,
              content: row.content,
              metadata: {
                toolCallId: row.tool_call_id,
                toolName: row.tool_name,
                timestamp: row.timestamp
              }
            }));
            resolve(messages);
          }
        }
      );
    });
  }

  async clear(sessionId = null) {
    const sid = sessionId || this.sessionId;
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM messages WHERE session_id = ?`, [sid], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = { SQLiteMemory };