export type HealthStatus = 'up' | 'down';

export interface HealthComponentDto {
  status: HealthStatus;
  detail?: string;
}

export interface HealthDto {
  status: HealthStatus;
  timestamp: string;
  components: {
    database: HealthComponentDto;
    camunda: HealthComponentDto;
  };
}
