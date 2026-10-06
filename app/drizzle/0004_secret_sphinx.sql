CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_records` (
	`id` text PRIMARY KEY NOT NULL,
	`person` text NOT NULL,
	`date` text NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`record` text DEFAULT '' NOT NULL,
	`consideration` text DEFAULT '' NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`person`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_daily_records_person` ON `daily_records` (`person`,`date`);--> statement-breakpoint
CREATE TABLE `person_traits` (
	`person` text PRIMARY KEY NOT NULL,
	`traits` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`person`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `record_examples` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL
);
