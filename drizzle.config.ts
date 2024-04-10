import type { Config } from 'drizzle-kit';

export default {
  schema: './app/models/schema.ts',
  out: './drizzle',
} satisfies Config;
