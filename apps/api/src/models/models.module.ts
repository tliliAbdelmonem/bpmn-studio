import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BpmnModule } from '../bpmn/bpmn.module';
import { EnvironmentVariables } from '../config/env.validation';
import { BpmnModelVersion } from './entities/bpmn-model-version.entity';
import { BpmnModel } from './entities/bpmn-model.entity';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BpmnModel, BpmnModelVersion]),
    MulterModule.registerAsync({
      inject: [ConfigService],
      // In-memory storage; uploads above the limit are rejected with 413.
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        limits: { fileSize: config.get('MAX_BPMN_SIZE_BYTES', { infer: true }), files: 1 },
      }),
    }),
    BpmnModule,
  ],
  controllers: [ModelsController, VersionsController],
  providers: [ModelsService, VersionsService],
  exports: [ModelsService, VersionsService],
})
export class ModelsModule {}
