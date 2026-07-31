import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MIGRATIONS = {
  community: "20260727065451_fix_communities_v6",
  lifecycle: "20260728081601_account_lifecycle_admin_presence_v9",
  profile: "20260728172801_profile_details_dark_mode_v10",
  moderation: "20260729135158_admin_post_moderation_v13",
};

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

async function migrationFinished(migrationName) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT finished_at AS finishedAt
       FROM _prisma_migrations
      WHERE migration_name = ?
      ORDER BY started_at DESC
      LIMIT 1`,
    migrationName,
  );

  return Boolean(rows[0]?.finishedAt);
}

async function resolveApplied(migrationName) {
  if (await migrationFinished(migrationName)) {
    console.log(`Migration already resolved: ${migrationName}`);
    return;
  }

  await prisma.$disconnect();
  runPrisma(["migrate", "resolve", "--applied", migrationName]);
  await prisma.$connect();
}

async function addColumn(database, tableName, columnName, definition) {
  if (await columnExists(database, tableName, columnName)) {
    console.log(`Column already exists: ${tableName}.${columnName}`);
    return;
  }

  console.log(`Adding column: ${tableName}.${columnName}`);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`,
  );
}

async function addIndex(database, tableName, indexName, columns, unique = false) {
  if (await indexExists(database, tableName, indexName)) {
    console.log(`Index already exists: ${indexName}`);
    return;
  }

  const prefix = unique ? "CREATE UNIQUE INDEX" : "CREATE INDEX";
  const quotedColumns = columns.map((column) => `\`${column}\``).join(", ");

  console.log(`Creating index: ${indexName}`);
  await prisma.$executeRawUnsafe(
    `${prefix} \`${indexName}\` ON \`${tableName}\`(${quotedColumns})`,
  );
}

async function repairCommunityMigration(database) {
  console.log(`\nRepairing ${MIGRATIONS.community}...`);

  if (!(await tableExists(database, "CommunityPost"))) {
    throw new Error(
      "CommunityPost does not exist. Earlier community migration is incomplete.",
    );
  }

  await addColumn(
    database,
    "CommunityPost",
    "topic",
    "ENUM('GENERAL', 'INTRODUCTIONS', 'WRITING', 'TECHNOLOGY', 'CAREER') NOT NULL DEFAULT 'GENERAL'",
  );

  if (!(await tableExists(database, "CommunityLike"))) {
    console.log("Creating table: CommunityLike");
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

  await addIndex(
    database,
    "CommunityPost",
    "CommunityPost_topic_idx",
    ["topic"],
  );

  await addIndex(
    database,
    "CommunityLike",
    "CommunityLike_communityPostId_idx",
    ["communityPostId"],
  );

  await addIndex(
    database,
    "CommunityLike",
    "CommunityLike_userId_communityPostId_key",
    ["userId", "communityPostId"],
    true,
  );

  if (
    !(await constraintExists(
      database,
      "CommunityLike",
      "CommunityLike_userId_fkey",
    ))
  ) {
    console.log("Adding foreign key: CommunityLike_userId_fkey");
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
    console.log("Adding foreign key: CommunityLike_communityPostId_fkey");
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `CommunityLike` ADD CONSTRAINT `CommunityLike_communityPostId_fkey` FOREIGN KEY (`communityPostId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE",
    );
  }

  await resolveApplied(MIGRATIONS.community);
}

async function repairLifecycleMigration(database) {
  console.log(`\nRepairing ${MIGRATIONS.lifecycle}...`);

  if (!(await tableExists(database, "User"))) {
    throw new Error("User table does not exist.");
  }

  await addColumn(database, "User", "deletionRequestedAt", "DATETIME(3) NULL");
  await addColumn(database, "User", "deletionScheduledFor", "DATETIME(3) NULL");
  await addColumn(database, "User", "disabledAt", "DATETIME(3) NULL");
  await addColumn(database, "User", "disabledReason", "VARCHAR(255) NULL");
  await addColumn(
    database,
    "User",
    "isDisabled",
    "BOOLEAN NOT NULL DEFAULT false",
  );
  await addColumn(database, "User", "lastLoginAt", "DATETIME(3) NULL");
  await addColumn(database, "User", "lastSeenAt", "DATETIME(3) NULL");

  await addIndex(database, "User", "User_isDisabled_idx", ["isDisabled"]);
  await addIndex(
    database,
    "User",
    "User_deletionScheduledFor_idx",
    ["deletionScheduledFor"],
  );
  await addIndex(database, "User", "User_lastSeenAt_idx", ["lastSeenAt"]);

  await resolveApplied(MIGRATIONS.lifecycle);
}

async function repairProfileMigration(database) {
  console.log(`\nRepairing ${MIGRATIONS.profile}...`);

  if (!(await tableExists(database, "User"))) {
    throw new Error("User table does not exist.");
  }

  await addColumn(database, "User", "headline", "VARCHAR(120) NULL");
  await addColumn(database, "User", "location", "VARCHAR(120) NULL");
  await addColumn(database, "User", "occupation", "VARCHAR(120) NULL");
  await addColumn(database, "User", "socialLink", "VARCHAR(500) NULL");
  await addColumn(database, "User", "website", "VARCHAR(500) NULL");

  await resolveApplied(MIGRATIONS.profile);
}

async function repairModerationMigration(database) {
  console.log(`\nRepairing ${MIGRATIONS.moderation}...`);

  if (!(await tableExists(database, "Post"))) {
    throw new Error("Post table does not exist.");
  }

  await addColumn(database, "Post", "blockedAt", "DATETIME(3) NULL");
  await addColumn(database, "Post", "blockedByAdminId", "INTEGER NULL");
  await addColumn(database, "Post", "blockedReason", "VARCHAR(255) NULL");
  await addColumn(
    database,
    "Post",
    "isBlocked",
    "BOOLEAN NOT NULL DEFAULT false",
  );

  await addIndex(database, "Post", "Post_isBlocked_idx", ["isBlocked"]);
  await addIndex(database, "Post", "Post_blockedAt_idx", ["blockedAt"]);

  await resolveApplied(MIGRATIONS.moderation);
}

async function verifyRequiredSchema(database) {
  const requiredColumns = [
    ["CommunityPost", "topic"],
    ["User", "isDisabled"],
    ["User", "headline"],
    ["Post", "isBlocked"],
    ["ContactMessage", "ticketCode"],
    ["ContactMessage", "adminReply"],
  ];

  for (const [tableName, columnName] of requiredColumns) {
    if (!(await columnExists(database, tableName, columnName))) {
      throw new Error(
        `Final verification failed: ${tableName}.${columnName} is missing.`,
      );
    }
  }

  console.log("\nFinal schema verification passed.");
}

async function main() {
  console.log("BlogVerse Railway migration repair V2 starting...");

  if (runPrisma(["migrate", "deploy"], { allowFailure: true })) {
    const database = await getDatabaseName();
    await verifyRequiredSchema(database);
    console.log("All Prisma migrations are already healthy.");
    return;
  }

  const database = await getDatabaseName();

  if (!database) {
    throw new Error("Unable to determine the active MySQL database.");
  }

  console.log(`Connected database: ${database}`);

  await repairCommunityMigration(database);
  await repairLifecycleMigration(database);
  await repairProfileMigration(database);
  await repairModerationMigration(database);

  await prisma.$disconnect();
  runPrisma(["migrate", "deploy"]);
  await prisma.$connect();

  await verifyRequiredSchema(database);

  console.log("\nSUCCESS: BlogVerse Railway migrations are healthy.");
}

main()
  .catch((error) => {
    console.error("\nRailway migration repair V2 failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
