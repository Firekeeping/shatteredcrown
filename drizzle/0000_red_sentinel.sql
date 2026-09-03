CREATE TABLE `multiplayer_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`host_token` text NOT NULL,
	`guest_token` text NOT NULL,
	`snapshot` text NOT NULL,
	`hero_ids` text DEFAULT '[]' NOT NULL,
	`assigned_hero_id` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`command_seq` integer DEFAULT 0 NOT NULL,
	`handled_seq` integer DEFAULT 0 NOT NULL,
	`command_json` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `multiplayer_sessions_updated_idx` ON `multiplayer_sessions` (`updated_at`);