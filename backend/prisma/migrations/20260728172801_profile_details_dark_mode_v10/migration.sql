-- AlterTable
ALTER TABLE `user` ADD COLUMN `headline` VARCHAR(120) NULL,
    ADD COLUMN `location` VARCHAR(120) NULL,
    ADD COLUMN `occupation` VARCHAR(120) NULL,
    ADD COLUMN `socialLink` VARCHAR(500) NULL,
    ADD COLUMN `website` VARCHAR(500) NULL;
