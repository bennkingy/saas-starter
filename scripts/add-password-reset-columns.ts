import { db } from "@/lib/db/drizzle";
import { sql } from "drizzle-orm";

async function addPasswordResetColumns() {
  try {
    // Check if columns exist and add them if they don't
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'password_reset_token'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "password_reset_token" text;
        END IF;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'password_reset_token_expires'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "password_reset_token_expires" timestamp;
        END IF;
      END $$;
    `);

    console.log("✅ Successfully added password reset columns to users table");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding password reset columns:", error);
    process.exit(1);
  }
}

addPasswordResetColumns();
