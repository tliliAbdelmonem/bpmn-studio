import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX } from '@bpmn-studio/shared';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/problem-details.filter';
import { createValidationPipe } from './common/validation';
import { EnvironmentVariables } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  // BPMN XML travels in JSON bodies; the default 100 kB limit is too small.
  app.useBodyParser('json', { limit: config.get('MAX_BPMN_SIZE_BYTES', { infer: true }) * 2 });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();

  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });
  if (corsOrigin) {
    app.enableCors({ origin: corsOrigin.split(',').map((o) => o.trim()) });
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('BPMN Studio API')
      .setDescription('Manage, version and deploy Camunda 8 BPMN models')
      .setVersion('0.1.0')
      .build(),
  );
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API on http://localhost:${port}/${API_PREFIX} (docs: /${API_PREFIX}/docs)`);
}

bootstrap();
