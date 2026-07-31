-- AlterTable
ALTER TABLE `post` ADD COLUMN `blockedAt` DATETIME(3) NULL,
    ADD COLUMN `blockedByAdminId` INTEGER NULL,
    ADD COLUMN `blockedReason` VARCHAR(255) NULL,
    ADD COLUMN `isBlocked` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `Post_isBlocked_idx` ON `Post`(`isBlocked`);

-- CreateIndex
CREATE INDEX `Post_blockedAt_idx` ON `Post`(`blockedAt`);
