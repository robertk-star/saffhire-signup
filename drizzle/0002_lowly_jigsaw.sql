ALTER TABLE `signupIntakes` ADD `sessionId` varchar(64);--> statement-breakpoint
ALTER TABLE `signupIntakes` ADD CONSTRAINT `signupIntakes_sessionId_unique` UNIQUE(`sessionId`);