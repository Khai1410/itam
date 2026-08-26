require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../db');

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.log('ADMIN_USERNAME/ADMIN_PASSWORD not set, skipping admin seed.');
    return;
  }

  const existing = await db('users').where({ username }).first();

  if (!existing) {
    const password_hash = await bcrypt.hash(password, 10);
    await db('users').insert({ username, password_hash, role: 'admin' });
    console.log(`Created admin user "${username}".`);
    return;
  }

  const matches = await bcrypt.compare(password, existing.password_hash);
  if (matches) {
    console.log(`Admin user "${username}" already up to date, skipping.`);
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);
  await db('users').where({ id: existing.id }).update({ password_hash });
  console.log(`Updated password for admin user "${username}" from ADMIN_PASSWORD.`);
}

main()
  .catch((err) => {
    console.error('create-admin failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
