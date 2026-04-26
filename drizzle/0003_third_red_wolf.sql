ALTER TABLE `signupIntakes` ADD `synced` enum('true','false') DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE `signupIntakes` ADD `syncedAt` timestamp;