import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FAILED_MIGRATION = "20260727065451_fix_communities_v6";

function runPrisma(args, { allowFailure = false } = {}) {
  console.log(`\n> npx prisma ${args.join(" ")}`);

  const result = spawnSync("npx", ["prisma", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  const succeeded = result.status === 0;

  if (!succeeded && !allowFailure) {
    throw new Error(`Prisma command failed: prisma ${args.join(" ")}`);
  }

  return succeeded;
}

async function getDatabaseName() {
  const rows = await prisma.$queryRawUnsafe("SELECT DATABASE() AS databaseName");
  return rows[0]?.databaseName;
}

async function tableExists(database, tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS total
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?`,
    database,
    tableName,
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function columnExists(database, tableName, columnName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    database,
    tableName,
    columnName,
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function indexExists(database, tableName, indexName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS total
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?`,
    database,
    tableName,
    indexName,
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function constraintExists(database, tableName, constraintName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS total
       FROM information_schema.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = ?
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?`,
    database,
    tableName,
    constraintName,
  );

  return Number(rows[0]?.total ?? 0) > 0;
}

async function repairCommunityMigration() {
  const database = await getDatabaseName();

  if (!database) {
    throw new Error("Unable to determine the active MySQL database name.");
  }

  console.log(`Repairing migration in database: ${database}`);

  if (!(await tableExists(database, "CommunityPost"))) {
    throw new Error(
      "CommunityPost does not exist. The earlier add_communities_profiles migration did not complete.",
    );
  }

  if (!(await columnExists(database, "CommunityPost", "topic"))) {
    console.log("Adding CommunityPost.topic using correct table-name casing...");
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `CommunityPost` ADD COLUMN `topic` ENUM('GENERAL', 'INTRODUCTIONS', 'WRITING', 'TECHNOLOGY', 'CAREER') NOT NULL DEFAULT 'GENERAL'",
    );
  }

  if (!(await tableExists(database, "CommunityLike"))) {
    console.log("Creating CommunityLike...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`CommunityLike\` (
        \`id\` INTEGER NOT NULL AUTO_INCREMENT,
        \`userId\` INTEGER NOT NULL,
        \`communityPostId\` INTEGER NOT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`CommunityLike_communityPostId_idx\`(\`communityPostId\`),
        UNIQUE INDEX \`CommunityLike_userId_communityPostId_key\`(\`userId\`, \`communityPostId\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  if (!(await indexExists(database, "CommunityPost", "CommunityPost_topic_idx"))) {
    console.log("Creating CommunityPost topic index...");
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `CommunityPost_topic_idx` ON `CommunityPost`(`topic`)",
    );
  }

  if (!(await indexExists(database, "CommunityLike", "CommunityLike_communityPostId_idx"))) {
    await prisma.$executeRawUnsafe(
      "CREATE INDEX `CommunityLike_communityPostId_idx` ON `CommunityLike`(`communityPostId`)",
    );
  }

  if (!(await indexExists(database, "CommunityLike", "CommunityLike_userId_communityPostId_key"))) {
    await prisma.$executeRawUnsafe(
      "CREATE UNIQUE INDEX `CommunityLike_userId_communityPostId_key` ON `CommunityLike`(`userId`, `communityPostId`)",
    );
  }

  if (!(await constraintExists(database, "CommunityLike", "CommunityLike_userId_fkey"))) {
    console.log("Adding CommunityLike user foreign key...");
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `CommunityLike` ADD CONSTRAINT `CommunityLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
    );
  }

  if (
    !(await constraintExists(
      database,
      "CommunityLike",
      "CommunityLike_communityPostId_fkey",
    ))
  ) {
    console.log("Adding CommunityLike community-post foreign key...");
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `CommunityLike` ADD CONSTRAINT `CommunityLike_communityPostId_fkey` FOREIGN KEY (`communityPostId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
    );
  }

  console.log("Community migration SQL repair completed.");
}

async function migrationAlreadyFinished() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT finished_at AS finishedAt
       FROM _prisma_migrations
      WHERE migration_name = ?
      ORDER BY started_at DESC
      LIMIT 1`,
    FAILED_MIGRATION,
  );

  return Boolean(rows[0]?.finishedAt);
}

async function main() {
  console.log("BlogVerse Railway migration repair starting...");

  if (runPrisma(["migrate", "deploy"], { allowFailure: true })) {
    console.log("All Prisma migrations applied successfully.");
    return;
  }

  console.log(`Repairing failed migration: ${FAILED_MIGRATION}`);

  await repairCommunityMigration();

  if (!(await migrationAlreadyFinished())) {
    await prisma.$disconnect();
    runPrisma(["migrate", "resolve", "--applied", FAILED_MIGRATION]);
  } else {
    await prisma.$disconnect();
  }

  runPrisma(["migrate", "deploy"]);
  console.log("BlogVerse Railway migrations are now healthy.");
}

main()
  .catch((error) => {
    console.error("Railway migration repair failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
