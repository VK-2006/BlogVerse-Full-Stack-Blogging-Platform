import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { cloudinaryConfigured, uploadPostFile } from "../utils/cloudinaryStorage.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legacyUploadDirectory = path.resolve(__dirname, "../../uploads/posts");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error(`File type ${file.mimetype || "unknown"} is not supported.`));
    }
    callback(null, true);
  }
});

async function saveLegacyLocalFile(file, baseUrl) {
  await fs.mkdir(legacyUploadDirectory, { recursive: true });
  const extension = path.extname(file.originalname).toLowerCase();
  const safeBase = path
    .basename(file.originalname, extension)
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) || "file";
  const storedName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeBase}${extension}`;
  await fs.writeFile(path.join(legacyUploadDirectory, storedName), file.buffer);
  return {
    originalName: file.originalname,
    storedName,
    url: `${baseUrl}/uploads/posts/${encodeURIComponent(storedName)}`,
    mimeType: file.mimetype,
    size: file.size
  };
}

router.post("/post", requireAuth, (req, res, next) => {
  upload.array("files", 5)(req, res, async (error) => {
    if (error) {
      const status = error.code === "LIMIT_FILE_SIZE" || error.code === "LIMIT_FILE_COUNT" ? 400 : 415;
      return res.status(status).json({
        success: false,
        message: error.code === "LIMIT_FILE_SIZE"
          ? "Each file must be 10 MB or smaller."
          : error.code === "LIMIT_FILE_COUNT"
            ? "You can upload a maximum of 5 files at a time."
            : error.message
      });
    }

    try {
      const persistentStorage = cloudinaryConfigured();
      if (!persistentStorage && process.env.NODE_ENV === "production") {
        return res.status(503).json({
          success: false,
          code: "PERSISTENT_UPLOAD_STORAGE_UNAVAILABLE",
          message: "Persistent file uploads are temporarily unavailable. Configure Cloudinary on the production backend."
        });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const files = persistentStorage
        ? await Promise.all((req.files || []).map((file) => uploadPostFile(file)))
        : await Promise.all((req.files || []).map((file) => saveLegacyLocalFile(file, baseUrl)));

      res.status(201).json({
        success: true,
        message: `${files.length} file${files.length === 1 ? "" : "s"} uploaded successfully.`,
        storage: persistentStorage ? "cloudinary" : "local-ephemeral",
        files
      });
    } catch (uploadError) {
      next(uploadError);
    }
  });
});

export default router;
