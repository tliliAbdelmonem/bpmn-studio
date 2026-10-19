import { Type, plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsUrl({ protocols: ['postgres', 'postgresql'], require_tld: false, require_protocol: true })
  DATABASE_URL!: string;

  @IsUrl({ protocols: ['http', 'https'], require_tld: false, require_protocol: true })
  CAMUNDA_BASE_URL = 'http://localhost:8080/v2';

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1024)
  MAX_BPMN_SIZE_BYTES = 5 * 1024 * 1024;
}

/** Used by ConfigModule: fails fast at boot with a readable list of problems. */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return env;
}
