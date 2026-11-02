const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaPGlite } = require('pglite-prisma-adapter');
const { PGlite } = require('@electric-sql/pglite');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const globalForPrisma = global;

const createPrismaClient = () => {
  // Check if we should use local embedded PostgreSQL (default if USE_LOCAL_DB=true or DATABASE_URL contains placeholder)
  const isLocalPreferred = process.env.USE_LOCAL_DB === 'true' || 
    !process.env.DATABASE_URL || 
    process.env.DATABASE_URL.includes('supabase.com') ||
    process.env.DATABASE_URL.includes('localhost');

  const pgliteDir = path.join(__dirname, '..', '..', 'prisma', 'pglite-db');
  if (!fs.existsSync(pgliteDir)) {
    fs.mkdirSync(pgliteDir, { recursive: true });
  }

  // Remove stale postmaster.pid if present to prevent startup lock
  const pidFile = path.join(pgliteDir, 'postmaster.pid');
  if (fs.existsSync(pidFile)) {
    try { fs.unlinkSync(pidFile); } catch (e) {}
  }

  // Use persistent PGlite for deterministic, zero-setup, offline-capable research execution
  console.log('📦 Using embedded persistent PostgreSQL (PGlite) at:', pgliteDir);
  const pglite = new PGlite(pgliteDir);
  const adapter = new PrismaPGlite(pglite);
  return new PrismaClient({ adapter, log: ['warn', 'error'] });
};

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;
