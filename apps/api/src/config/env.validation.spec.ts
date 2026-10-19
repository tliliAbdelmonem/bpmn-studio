import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults', () => {
    const env = validateEnv({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' });
    expect(env.PORT).toBe(3000);
    expect(env.CAMUNDA_BASE_URL).toBe('http://localhost:8080/v2');
  });

  it('converts numeric strings', () => {
    const env = validateEnv({ DATABASE_URL: 'postgres://u:p@db:5432/db', PORT: '4000' });
    expect(env.PORT).toBe(4000);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-http CAMUNDA_BASE_URL', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'postgres://u:p@db:5432/db', CAMUNDA_BASE_URL: 'ftp://x' }),
    ).toThrow(/CAMUNDA_BASE_URL/);
  });
});
