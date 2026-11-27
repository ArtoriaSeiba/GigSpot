CREATE TABLE IF NOT EXISTS `BandLinkInvite` (
  `id` VARCHAR(191) NOT NULL,
  `token` VARCHAR(64) NOT NULL,
  `bandId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NOT NULL,
  `acceptedAt` DATETIME(3) NULL,
  `acceptedById` VARCHAR(191) NULL,
  `revokedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `BandLinkInvite_token_key` (`token`),
  KEY `BandLinkInvite_bandId_createdAt_idx` (`bandId`, `createdAt`),
  KEY `BandLinkInvite_acceptedById_idx` (`acceptedById`),
  CONSTRAINT `BandLinkInvite_bandId_fkey` FOREIGN KEY (`bandId`) REFERENCES `Band` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `BandLinkInvite_acceptedById_fkey` FOREIGN KEY (`acceptedById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
