import { DataSourceOptions } from 'typeorm';
import { BpmnModelVersion } from '../models/entities/bpmn-model-version.entity';
import { BpmnModel } from '../models/entities/bpmn-model.entity';
import { migrations } from './migrations';

/** Shared by the Nest TypeORM module and the TypeORM CLI data source. */
export function buildTypeOrmOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [BpmnModel, BpmnModelVersion],
    // gen_random_uuid() is built into PostgreSQL 13+, no uuid-ossp extension needed.
    uuidExtension: 'pgcrypto',
    migrations,
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
  };
}
