const bcrypt = require('bcrypt');
const pool = require('../config/database');
const env = require('../config/env');

async function seedAdmin() {
  const email = env.adminSeed.email.trim().toLowerCase();
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);

  if (existing.length) {
    console.log(`Admin seed skipped, email already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(env.adminSeed.password, 12);
  await pool.query(
    `
    INSERT INTO users (full_name, email, password_hash, role)
    VALUES (?, ?, ?, 'ADMIN')
    `,
    [env.adminSeed.fullName, email, passwordHash]
  );

  console.log(`Admin created: ${email}`);
}

seedAdmin()
  .catch((err) => {
    console.error('Admin seed failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
