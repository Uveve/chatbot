import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { getLogger } from '../utils/logger';

// Inisialisasi logger
const logger = getLogger('db-migration');

// Load environment variables
dotenv.config();

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in .env file');
  }

  const connection = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection);

  logger.info('⏳ Running migrations...');

  const start = Date.now();
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  const end = Date.now();

  logger.info('✅ Migrations completed in', end - start, 'ms');
  logger.end();
  process.exit(0);
};

runMigrate().catch((err) => {
  const logger = getLogger('db-migration-error');
  logger.error('❌ Migration failed');
  logger.error(err);
  logger.end();
  process.exit(1);
});
