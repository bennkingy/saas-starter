DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_reset_token') THEN
    ALTER TABLE "users" ADD COLUMN "password_reset_token" text;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_reset_token_expires') THEN
    ALTER TABLE "users" ADD COLUMN "password_reset_token_expires" timestamp;
  END IF;
END $$;
