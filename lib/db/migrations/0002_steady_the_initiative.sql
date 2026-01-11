CREATE TABLE "scraper_state" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"etag" text,
	"last_modified" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
