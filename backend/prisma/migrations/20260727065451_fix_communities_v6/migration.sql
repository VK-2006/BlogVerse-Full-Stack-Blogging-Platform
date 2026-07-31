-- AlterTable
ALTER TABLE `communitypost` ADD COLUMN `topic` ENUM('GENERAL', 'INTRODUCTIONS', 'WRITING', 'TECHNOLOGY', 'CAREER') NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE `CommunityLike` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `communityPostId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommunityLike_communityPostId_idx`(`communityPostId`),
    UNIQUE INDEX `CommunityLike_userId_communityPostId_key`(`userId`, `communityPostId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `CommunityPost_topic_idx` ON `CommunityPost`(`topic`);

-- AddForeignKey
ALTER TABLE `CommunityLike` ADD CONSTRAINT `CommunityLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityLike` ADD CONSTRAINT `CommunityLike_communityPostId_fkey` FOREIGN KEY (`communityPostId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
