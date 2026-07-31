-- Use only if Prisma migration cannot be run.
-- Back up the database before executing manually.
USE blogverse_db;

ALTER TABLE `Post`
  ADD COLUMN `isBlocked` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `blockedAt` DATETIME(3) NULL,
  ADD COLUMN `blockedReason` VARCHAR(255) NULL,
  ADD COLUMN `blockedByAdminId` INT NULL;

CREATE INDEX `Post_isBlocked_idx` ON `Post`(`isBlocked`);
CREATE INDEX `Post_blockedAt_idx` ON `Post`(`blockedAt`);
