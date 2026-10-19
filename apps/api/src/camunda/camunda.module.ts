import { Module } from '@nestjs/common';
import { CamundaClientService } from './camunda-client.service';

@Module({
  providers: [CamundaClientService],
  exports: [CamundaClientService],
})
export class CamundaModule {}
