-- AlterTable
ALTER TABLE `user` ADD COLUMN `deletionRequestedAt` DATETIME(3) NULL,
    ADD COLUMN `deletionScheduledFor` DATETIME(3) NULL,
    ADD COLUMN `disabledAt` DATETIME(3) NULL,
    ADD COLUMN `disabledReason` VARCHAR(255) NULL,
    ADD COLUMN `isDisabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `lastSeenAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `User_isDisabled_idx` ON `User`(`isDisabled`);

-- CreateIndex
CREATE INDEX `User_deletionScheduledFor_idx` ON `User`(`deletionScheduledFor`);

-- CreateIndex
CREATE INDEX `User_lastSeenAt_idx` ON `User`(`lastSeenAt`);
