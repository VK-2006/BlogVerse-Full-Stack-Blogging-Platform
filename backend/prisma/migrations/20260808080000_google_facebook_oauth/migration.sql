CREATE TABLE `OAuthAccount` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `provider` ENUM('GOOGLE', 'FACEBOOK') NOT NULL,
  `providerUserId` VARCHAR(191) NOT NULL,
  `providerEmail` VARCHAR(191) NULL,
  `userId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `OAuthAccount_provider_providerUserId_key`(`provider`, `providerUserId`),
  UNIQUE INDEX `OAuthAccount_provider_userId_key`(`provider`, `userId`),
  INDEX `OAuthAccount_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OAuthLoginCode` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `codeHash` VARCHAR(64) NOT NULL,
  `userId` INTEGER NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `OAuthLoginCode_codeHash_key`(`codeHash`),
  INDEX `OAuthLoginCode_userId_idx`(`userId`),
  INDEX `OAuthLoginCode_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OAuthAccount`
  ADD CONSTRAINT `OAuthAccount_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OAuthLoginCode`
  ADD CONSTRAINT `OAuthLoginCode_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
