import { Module } from '@nestjs/common';
import { CamundaModule } from '../camunda/camunda.module';
import { HealthController } from './health.controller';

@Module({
  imports: [CamundaModule],
  controllers: [HealthController],
})
export class HealthModule {}
