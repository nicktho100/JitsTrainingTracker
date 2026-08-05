CREATE TABLE `training_sessions` (
	`owner_id` text NOT NULL,
	`training_date` text NOT NULL,
	`hours` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`owner_id`, `training_date`),
	CONSTRAINT "training_sessions_hours_check" CHECK("training_sessions"."hours" > 0 AND "training_sessions"."hours" <= 24)
);
--> statement-breakpoint
CREATE INDEX `training_sessions_owner_date_idx` ON `training_sessions` (`owner_id`,`training_date`);--> statement-breakpoint
CREATE TABLE `yearly_totals` (
	`owner_id` text NOT NULL,
	`year` integer NOT NULL,
	`hours` real NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`owner_id`, `year`),
	CONSTRAINT "yearly_totals_year_check" CHECK("yearly_totals"."year" IN (2024, 2025)),
	CONSTRAINT "yearly_totals_hours_check" CHECK("yearly_totals"."hours" >= 0 AND "yearly_totals"."hours" <= 5000)
);
