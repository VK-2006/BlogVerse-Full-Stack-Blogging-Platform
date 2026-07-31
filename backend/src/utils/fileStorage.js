import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const postUploadDirectory = path.resolve(__dirname, "../../uploads/posts");

export async function removeStoredPostFiles(attachments = []) {
  const safeNames = attachments
    .map((attachment) => path.basename(String(attachment.storedName || "")))
    .filter(Boolean);

  await Promise.allSettled(
    safeNames.map((storedName) => fs.unlink(path.join(postUploadDirectory, storedName)))
  );
}
