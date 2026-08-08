-- Extend the existing password reset table for OTP verification followed by a one-time reset session.
ALTER TABLE `PasswordResetToken`
  ADD COLUMN `resetTokenHash` VARCHAR(64) NULL,
  ADD COLUMN `attempts` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `verifiedAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `PasswordResetToken_resetTokenHash_key`
  ON `PasswordResetToken`(`resetTokenHash`);
