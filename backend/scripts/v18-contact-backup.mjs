import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");
const backupDir = path.join(backendDir, "backups");

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

try {
  const databaseRows = await prisma.$queryRawUnsafe("SELECT DATABASE() AS databaseName");
  const databaseName = databaseRows?.[0]?.databaseName ?? "unknown";

  const rows = await prisma.$queryRawUnsafe(
    "SELECT * FROM `ContactMessage` ORDER BY `id` ASC"
  );

  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `contactmessage-before-v18-${stamp()}.json`
  );

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        database: databaseName,
        createdAt: new Date().toISOString(),
        rowCount: rows.length,
        rows
      },
      null,
      2
    ),
    "utf8"
  );

  const statuses = [...new Set(rows.map((row) => String(row.status ?? "NULL")))];
  console.log(`[BACKUP PASS] Database: ${databaseName}`);
  console.log(`[BACKUP PASS] Contact messages saved: ${rows.length}`);
  console.log(`[BACKUP PASS] Existing statuses: ${statuses.join(", ") || "none"}`);
  console.log(`[BACKUP PASS] Local backup: ${backupPath}`);
} catch (error) {
  console.error("[BACKUP FAILED] Could not back up ContactMessage data.");
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
