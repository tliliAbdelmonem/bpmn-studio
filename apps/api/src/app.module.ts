import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvironmentVariables, validateEnv } from './config/env.validation';
import { buildTypeOrmOptions } from './database/typeorm-options';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        ...buildTypeOrmOptions(config.get('DATABASE_URL', { infer: true })),
        // Give Postgres a moment at startup, then fail loudly.
        retryAttempts: 3,
        retryDelay: 2000,
      }),
    }),
    HealthModule,
  ],
})
export class AppModule {}
