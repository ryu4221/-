CREATE TABLE `board_files` (
	`id` text PRIMARY KEY NOT NULL,
	`post` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`post`) REFERENCES `board_posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_board_files_post` ON `board_files` (`post`);--> statement-breakpoint
CREATE TABLE `board_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `board_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`folder` text,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`author` text NOT NULL,
	`important` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`folder`) REFERENCES `board_folders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_board_posts_folder` ON `board_posts` (`folder`);--> statement-breakpoint
CREATE TABLE `board_reads` (
	`post` text NOT NULL,
	`staff` text NOT NULL,
	`read_at` text NOT NULL,
	PRIMARY KEY(`post`, `staff`),
	FOREIGN KEY (`post`) REFERENCES `board_posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff`) REFERENCES `board_staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `board_staff` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL
);
