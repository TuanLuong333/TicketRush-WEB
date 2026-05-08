const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error('DB_NAME chỉ nên chứa chữ cái, số và dấu gạch dưới');
  }

  return `\`${identifier}\``;
}

async function run() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(env.db.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE ${quoteIdentifier(env.db.database)}`);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const files = fs
      .readdirSync(__dirname)
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    for (const file of files) {
      const [existing] = await connection.query(
        'SELECT id FROM schema_migrations WHERE filename = ? LIMIT 1',
        [file]
      );

      if (existing.length) {
        console.log(`Skipping ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      console.log(`Applied ${file}`);
    }
  } finally {
    await connection.end();
  }
}

run().catch((err) => {
  console.error('Migration failed', err);
  process.exit(1);
});
