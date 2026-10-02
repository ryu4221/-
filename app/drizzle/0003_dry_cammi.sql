CREATE TABLE `board_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post` text NOT NULL,
	`staff` text,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`post`) REFERENCES `board_posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff`) REFERENCES `board_staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_board_comments_post` ON `board_comments` (`post`);--> statement-breakpoint
CREATE TABLE `board_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `board_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`target` text DEFAULT '' NOT NULL,
	`folder` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `board_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`post` text NOT NULL,
	`version` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`author` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`post`) REFERENCES `board_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_board_versions_post` ON `board_versions` (`post`);--> statement-breakpoint
ALTER TABLE `board_files` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `board_folders` ADD `binder` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `board_posts` ADD `target` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `board_posts` ADD `due` text;--> statement-breakpoint
ALTER TABLE `board_posts` ADD `expires` text;--> statement-breakpoint
ALTER TABLE `board_posts` ADD `pinned` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `board_posts` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `board_posts` ADD `thumb` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `board_reads` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `board_staff` ADD `admin` integer DEFAULT 0 NOT NULL;