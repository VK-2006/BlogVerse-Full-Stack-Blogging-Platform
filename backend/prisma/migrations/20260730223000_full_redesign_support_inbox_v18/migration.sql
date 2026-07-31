-- BlogVerse V18: Contact support inbox and administrator reply workflow
-- This migration preserves all existing ContactMessage rows.

ALTER TABLE `ContactMessage`
    ADD COLUMN `ticketCode` VARCHAR(24) NULL,
    ADD COLUMN `adminReply` TEXT NULL,
    ADD COLUMN `userId` INTEGER NULL,
    ADD COLUMN `repliedByAdminId` INTEGER NULL,
    ADD COLUMN `repliedAt` DATETIME(3) NULL,
    ADD COLUMN `closedAt` DATETIME(3) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Normalize legacy string statuses before converting the column to an enum.
UPDATE `ContactMessage`
SET `status` = CASE
    WHEN UPPER(REPLACE(TRIM(`status`), ' ', '_')) IN ('NEW', 'IN_PROGRESS', 'REPLIED', 'CLOSED')
        THEN UPPER(REPLACE(TRIM(`status`), ' ', '_'))
    WHEN UPPER(TRIM(`status`)) IN ('RESPONDED', 'ANSWERED') THEN 'REPLIED'
    WHEN UPPER(TRIM(`status`)) IN ('DONE', 'RESOLVED') THEN 'CLOSED'
    WHEN UPPER(TRIM(`status`)) IN ('PENDING', 'OPEN') THEN 'NEW'
    ELSE 'NEW'
END;

-- Give every legacy message a deterministic unique ticket code.
UPDATE `ContactMessage`
SET `ticketCode` = CONCAT('BV-LEGACY-', `id`)
WHERE `ticketCode` IS NULL OR TRIM(`ticketCode`) = '';

ALTER TABLE `ContactMessage`
    MODIFY `status` ENUM('NEW', 'IN_PROGRESS', 'REPLIED', 'CLOSED') NOT NULL DEFAULT 'NEW';

CREATE UNIQUE INDEX `ContactMessage_ticketCode_key` ON `ContactMessage`(`ticketCode`);
CREATE INDEX `ContactMessage_userId_idx` ON `ContactMessage`(`userId`);
CREATE INDEX `ContactMessage_repliedByAdminId_idx` ON `ContactMessage`(`repliedByAdminId`);

ALTER TABLE `ContactMessage`
    ADD CONSTRAINT `ContactMessage_userId_fkey`
        FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `ContactMessage_repliedByAdminId_fkey`
        FOREIGN KEY (`repliedByAdminId`) REFERENCES `User`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;
