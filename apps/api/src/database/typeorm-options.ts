import { DataSourceOptions } from 'typeorm';
import { migrations } from './migrations';

/** Shared by the Nest TypeORM module and the TypeORM CLI data source. */
export function buildTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [],
    migrations,
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
  };
}
