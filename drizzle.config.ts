import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  schema: './app/models/schema.ts',
  out: './drizzle',
} satisfies Config;
