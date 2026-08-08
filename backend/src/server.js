import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import oauthRoutes from "./routes/oauth.js";
import postRoutes from "./routes/posts.js";
import commentRoutes from "./routes/comments.js";
import userRoutes from "./routes/users.js";
import contactRoutes from "./routes/contact.js";
import uploadRoutes from "./routes/uploads.js";
import communityRoutes from "./routes/community.js";
import adminRoutes from "./routes/admin.js";
import { startAccountCleanupJob } from "./utils/accountCleanup.js";
import prisma from "./utils/prisma.js";
import { errorHandler, notFound } from "./middleware/error.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in backend/.env");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in backend/.env");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set("trust proxy", 1);
const port = Number(process.env.PORT) || 5000;

function normalizeFrontendOrigin(value) {
  const cleaned = String(value || "").trim().replace(/\/+$/, "");
  if (/[\r\n]/.test(cleaned)) {
    throw new Error("FRONTEND_URL contains invalid line breaks.");
  }

  let url;
  try {
    url = new URL(cleaned);
  } catch {
    throw new Error("FRONTEND_URL must be a valid absolute http(s) origin.");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("FRONTEND_URL must contain only the frontend origin, for example https://blogverse-full-stack.vercel.app");
  }

  return url.origin;
}

const frontendUrl = normalizeFrontendOrigin(process.env.FRONTEND_URL || "http://localhost:5173");

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
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

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: "UP",
      database: "UP",
      message: "BlogVerse API is running.",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check database probe failed:", error.message);
    res.status(503).json({
      success: false,
      status: "DEGRADED",
      database: "DOWN",
      message: "BlogVerse API is running but the database is unavailable.",
      timestamp: new Date().toISOString()
    });
  }
});

app.use("/api/auth/oauth", oauthRoutes);
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

const server = app.listen(port, "0.0.0.0", () => {
  startAccountCleanupJob();
  console.log(`BlogVerse API running at http://localhost:${port}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Shutting down BlogVerse API...`);

  const forceTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  server.close(async () => {
    try {
      await prisma.$disconnect();
      clearTimeout(forceTimer);
      process.exit(0);
    } catch (error) {
      console.error("Prisma disconnect failed during shutdown:", error);
      process.exit(1);
    }
  });
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
