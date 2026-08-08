import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deleteCloudinaryAsset } from "./cloudinaryStorage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const postUploadDirectory = path.resolve(__dirname, "../../uploads/posts");

async function deleteStoredAttachment(attachment) {
  const storedName = String(attachment?.storedName || "").trim();
  if (!storedName) return;

  if (storedName.startsWith("cloudinary:")) {
    await deleteCloudinaryAsset(storedName);
    return;
  }

  const legacyName = path.basename(storedName);
  if (!legacyName) return;
  await fs.unlink(path.join(postUploadDirectory, legacyName)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

export async function removeStoredPostFiles(attachments = []) {
  const results = await Promise.allSettled(attachments.map(deleteStoredAttachment));
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Stored attachment cleanup failed:", result.reason);
    }
  });
}
