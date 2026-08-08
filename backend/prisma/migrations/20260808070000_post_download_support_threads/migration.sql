-- Post download permissions/counters and threaded support conversations.
ALTER TABLE `Post`
  ADD COLUMN `downloadEnabled` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `downloadCount` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `ContactThreadEntry` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `contactMessageId` INTEGER NOT NULL,
  `actor` ENUM('USER', 'ADMIN') NOT NULL,
  `senderUserId` INTEGER NULL,
  `senderName` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ContactThreadEntry_contactMessageId_createdAt_idx`(`contactMessageId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContactThreadEntry`
  ADD CONSTRAINT `ContactThreadEntry_contactMessageId_fkey`
  FOREIGN KEY (`contactMessageId`) REFERENCES `ContactMessage`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
