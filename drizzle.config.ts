import type { Config } from "drizzle-kit";

export default {
  dialect: "postgresql",
  schema: "./app/models/schema.ts",
  out: "./drizzle",
} satisfies Config;
