import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error(
    "POSTGRES_URL environment variable is not set. Database connection unavailable."
  );
}

export const client = postgres(process.env.POSTGRES_URL);
export const db: PostgresJsDatabase<typeof schema> = drizzle(client, {
  schema,
});
