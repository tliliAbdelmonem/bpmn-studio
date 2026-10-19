import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';

/**
 * The only place that talks to the Camunda 8 Orchestration Cluster REST API.
 * Phase 1 only checks reachability; deployments are added in Phase 5.
 */
@Injectable()
export class CamundaClientService {
  private readonly baseUrl: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.baseUrl = config.get('CAMUNDA_BASE_URL', { infer: true }).replace(/\/+$/, '');
  }

  /** GET /topology; resolves to true when the gateway answers 2xx. */
  async isReachable(timeoutMs = 2000): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/topology`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
