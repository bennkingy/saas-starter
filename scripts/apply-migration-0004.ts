import { db } from "../lib/db/drizzle";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Applying migration 0004: Adding notified_at column to products...");
  
  try {
    await db.execute(sql`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "notified_at" timestamp;`);
    console.log("✅ Migration applied successfully!");
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      console.log("✅ Column already exists, migration already applied.");
    } else {
      console.error("❌ Failed to apply migration:", error);
      process.exit(1);
    }
  }
  
  process.exit(0);
}

main();

