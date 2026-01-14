import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

dotenv.config();

let _client: ReturnType<typeof postgres> | null = null;
let _db: PostgresJsDatabase<typeof schema> | null = null;

function getClient() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set. Database connection unavailable.');
  }
  
  if (!_client) {
    _client = postgres(process.env.POSTGRES_URL);
  }
  
  return _client;
}

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set. Database connection unavailable.');
  }
  
  if (!_db) {
    const client = getClient();
    _db = drizzle(client, { schema });
  }
  
  return _db;
}

// Lazy-loaded exports - connection only created when accessed
export const client = new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop) {
    return getClient()[prop as keyof ReturnType<typeof postgres>];
  }
});

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof PostgresJsDatabase<typeof schema>];
  }
});
