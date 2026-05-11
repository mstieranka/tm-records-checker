CREATE TABLE "maps" (
	"ingame_id" text PRIMARY KEY NOT NULL,
	"ingame_name" text NOT NULL,
	"tmx_id" integer NOT NULL,
	"tmx_name" text NOT NULL,
	"author_time_ms" integer NOT NULL,
	"uploaded_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "maps_tmx_id_unique" UNIQUE("tmx_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"map_id" text NOT NULL,
	"player_id" text NOT NULL,
	"time_ms" integer NOT NULL,
	"timestamp" text NOT NULL,
	CONSTRAINT "records_map_id_player_id_unique" UNIQUE("map_id","player_id"),
	CONSTRAINT "records_map_id_player_id_time_ms_unique" UNIQUE("map_id","player_id","time_ms")
);
--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_map_id_maps_ingame_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("ingame_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;