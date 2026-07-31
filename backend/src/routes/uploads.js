import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.resolve(__dirname, "../../uploads/posts");
fs.mkdirSync(uploadDirectory, { recursive: true });

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

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "file";
    callback(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeBase}${extension}`);
  }
});

const upload = multer({
  storage,
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

router.post("/post", requireAuth, (req, res, next) => {
  upload.array("files", 5)(req, res, (error) => {
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
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const files = (req.files || []).map((file) => ({
        originalName: file.originalname,
        storedName: file.filename,
        url: `${baseUrl}/uploads/posts/${encodeURIComponent(file.filename)}`,
        mimeType: file.mimetype,
        size: file.size
      }));

      res.status(201).json({
        success: true,
        message: `${files.length} file${files.length === 1 ? "" : "s"} uploaded successfully.`,
        files
      });
    } catch (uploadError) {
      next(uploadError);
    }
  });
});

export default router;
