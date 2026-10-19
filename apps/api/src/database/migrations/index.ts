import { MixedList } from 'typeorm';

/**
 * Every migration class, listed explicitly (the API is bundled by webpack,
 * so glob paths do not work at runtime). Generated migrations are added here.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const migrations: MixedList<Function> = [];
