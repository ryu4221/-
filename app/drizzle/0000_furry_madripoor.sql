CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`person` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`person`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_documents_person` ON `documents` (`person`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL
);
