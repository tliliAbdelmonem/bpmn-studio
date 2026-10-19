/**
 * TypeORM CLI entry point (migration:generate / run / revert).
 * Not imported by the app. Reads DATABASE_URL from the environment or the root .env.
 */
import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

if (!process.env['DATABASE_URL'] && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

export default new DataSource(buildTypeOrmOptions(databaseUrl));
