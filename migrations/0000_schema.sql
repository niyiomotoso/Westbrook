CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`kicker` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`media_key` text,
	`start_at` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`canceled` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text,
	`place_tag` text,
	`media_key` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`month` text NOT NULL,
	`text` text NOT NULL,
	`consented` integer NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`price_ngn` integer NOT NULL,
	`tag_text` text,
	`enabled` integer DEFAULT 1 NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `screens` (
	`key` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`build_id` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`kicker` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
