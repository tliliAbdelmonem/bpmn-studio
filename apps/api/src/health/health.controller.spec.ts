import { DataSource } from 'typeorm';
import { CamundaClientService } from '../camunda/camunda-client.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const build = (dbOk: boolean, camundaOk: boolean) =>
    new HealthController(
      {
        query: jest.fn(() => (dbOk ? Promise.resolve([]) : Promise.reject(new Error('refused')))),
      } as unknown as DataSource,
      { isReachable: jest.fn().mockResolvedValue(camundaOk) } as unknown as CamundaClientService,
    );

  it('is up when the database is up, even if Camunda is down', async () => {
    const h = await build(true, false).check();
    expect(h.status).toBe('up');
    expect(h.components.camunda.status).toBe('down');
  });

  it('is down when the database is down', async () => {
    const h = await build(false, true).check();
    expect(h.status).toBe('down');
    expect(h.components.database.detail).toBe('refused');
  });
});
