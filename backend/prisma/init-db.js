require('dotenv').config();
const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

async function initDb() {
  const dbDir = path.join(__dirname, 'pglite-db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const pidFile = path.join(dbDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try { fs.unlinkSync(pidFile); } catch (e) {}
  }

  console.log('🔄 Initializing local embedded PostgreSQL (PGlite)...');
  const pglite = new PGlite(dbDir);
  
  // Generate current schema DDL from prisma schema
  const ddl = execSync('npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });

  // Split and execute statements, ignoring already exists errors
  const statements = ddl
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await pglite.exec(statement + ';');
    } catch (err) {
      // Ignore "already exists" errors if re-running
      if (!err.message.includes('already exists')) {
        console.warn('Notice:', err.message);
      }
    }
  }

  const tables = await pglite.query("SELECT tablename FROM pg_tables WHERE schemaname='public';");
  console.log(`✅ PGlite Database ready with ${tables.rows.length} tables:`, tables.rows.map(r => r.tablename).join(', '));
  await pglite.close();
}

if (require.main === module) {
  initDb()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Database initialization error:', err);
      process.exit(1);
    });
}

module.exports = initDb;
