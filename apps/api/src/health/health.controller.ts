import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HealthComponentDto, HealthDto } from '@bpmn-studio/shared';
import { DataSource } from 'typeorm';
import { CamundaClientService } from '../camunda/camunda-client.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly camunda: CamundaClientService,
  ) {}

  /** Database is required; Camunda reachability is reported but does not fail the check. */
  @Get()
  @ApiOkResponse({ description: 'API, database and Camunda status' })
  async check(): Promise<HealthDto> {
    const [database, camunda] = await Promise.all([this.checkDatabase(), this.checkCamunda()]);
    return {
      status: database.status,
      timestamp: new Date().toISOString(),
      components: { database, camunda },
    };
  }

  private async checkDatabase(): Promise<HealthComponentDto> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up' };
    } catch (e) {
      return { status: 'down', detail: e instanceof Error ? e.message : String(e) };
    }
  }

  private async checkCamunda(): Promise<HealthComponentDto> {
    return (await this.camunda.isReachable()) ? { status: 'up' } : { status: 'down' };
  }
}
