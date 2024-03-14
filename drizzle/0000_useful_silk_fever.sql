CREATE TABLE `maps` (
	`ingame_id` text PRIMARY KEY NOT NULL,
	`ingame_name` text NOT NULL,
	`tmx_id` integer NOT NULL,
	`tmx_name` text NOT NULL,
	`author_time_ms` integer NOT NULL,
	`uploaded_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`map_id` text NOT NULL,
	`player_id` text NOT NULL,
	`time_ms` integer NOT NULL,
	`timestamp` text NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`ingame_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `maps_tmx_id_unique` ON `maps` (`tmx_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `records_map_id_player_id_unique` ON `records` (`map_id`,`player_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `records_map_id_player_id_time_ms_unique` ON `records` (`map_id`,`player_id`,`time_ms`);