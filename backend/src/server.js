import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";
import commentRoutes from "./routes/comments.js";
import userRoutes from "./routes/users.js";
import contactRoutes from "./routes/contact.js";
import uploadRoutes from "./routes/uploads.js";
import communityRoutes from "./routes/community.js";
import adminRoutes from "./routes/admin.js";
import { startAccountCleanupJob } from "./utils/accountCleanup.js";
import { errorHandler, notFound } from "./middleware/error.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in backend/.env");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set("trust proxy", 1);
const port = Number(process.env.PORT) || 5000;
const frontendUrl = String(process.env.FRONTEND_URL || "http://localhost:5173").trim().replace(/\/$/, "");

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads"), {
  maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
  fallthrough: false
}));
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    name: "BlogVerse API",
    message: `Backend is running. Open the React website at ${frontendUrl}.`,
    health: "/api/health",
    apiBase: "/api"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "BlogVerse API is running.",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  startAccountCleanupJob();
  console.log(`BlogVerse API running at http://localhost:${port}`);
});
