import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const allowedStatuses = new Set(["NEW", "IN_PROGRESS", "REPLIED", "CLOSED"]);
const requiredColumns = [
  "ticketCode",
  "adminReply",
  "userId",
  "repliedByAdminId",
  "repliedAt",
  "closedAt",
  "updatedAt"
];

try {
  const columns = await prisma.$queryRawUnsafe(`
    SELECT COLUMN_NAME AS columnName, COLUMN_TYPE AS columnType
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND LOWER(TABLE_NAME) = LOWER('ContactMessage')
  `);

  const columnNames = new Set(columns.map((item) => item.columnName));
  const missingColumns = requiredColumns.filter((name) => !columnNames.has(name));
  if (missingColumns.length) {
    throw new Error(`Missing ContactMessage columns: ${missingColumns.join(", ")}`);
  }

  const statusColumn = columns.find((item) => item.columnName === "status");
  if (!String(statusColumn?.columnType || "").toLowerCase().startsWith("enum(")) {
    throw new Error("ContactMessage.status was not converted to the expected enum.");
  }

  const rows = await prisma.$queryRawUnsafe(
    "SELECT `id`, `ticketCode`, `status` FROM `ContactMessage` ORDER BY `id` ASC"
  );

  const invalidStatuses = rows.filter((row) => !allowedStatuses.has(String(row.status)));
  if (invalidStatuses.length) {
    throw new Error(`Invalid status values remain on ${invalidStatuses.length} row(s).`);
  }

  const missingTickets = rows.filter((row) => !String(row.ticketCode || "").trim());
  if (missingTickets.length) {
    throw new Error(`Missing ticket codes remain on ${missingTickets.length} row(s).`);
  }

  const ticketCodes = rows.map((row) => String(row.ticketCode));
  if (new Set(ticketCodes).size !== ticketCodes.length) {
    throw new Error("Duplicate ticket codes were found after migration.");
  }

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND LOWER(TABLE_NAME) = LOWER('ContactMessage')
  `);

  const ticketIndex = indexes.find(
    (item) => item.indexName === "ContactMessage_ticketCode_key"
  );
  if (!ticketIndex || Number(ticketIndex.nonUnique) !== 0) {
    throw new Error("Unique ticketCode index is missing.");
  }

  console.log(`[VERIFY PASS] ContactMessage rows preserved: ${rows.length}`);
  console.log("[VERIFY PASS] Support ticket columns are present.");
  console.log("[VERIFY PASS] Status enum is valid.");
  console.log("[VERIFY PASS] Ticket codes are present and unique.");
  console.log("[VERIFY PASS] BlogVerse V18 database update completed safely.");
} catch (error) {
  console.error("[VERIFY FAILED]", error?.message || error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
