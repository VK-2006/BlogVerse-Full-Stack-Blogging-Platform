import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import {
  signAccountRecoveryToken,
  signToken,
  verifyAccountRecoveryToken,
  verifyToken
} from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";
import { removeStoredPostFiles } from "../utils/fileStorage.js";

const router = Router();

const passwordSchema = z.string().min(8).max(72)
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[0-9]/, "Password must contain a number.");

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().toLowerCase(),
  password: passwordSchema
});

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  bio: true,
  headline: true,
  occupation: true,
  location: true,
  website: true,
  socialLink: true,
  lastLoginAt: true,
  lastSeenAt: true,
  deletionRequestedAt: true,
  deletionScheduledFor: true
};

router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });

    if (existing) {
      return res.status(409).json({ success: false, message: "Email is already registered." });
    }

    const now = new Date();
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 12),
        lastLoginAt: now,
        lastSeenAt: now
      },
      select: safeUserSelect
    });

    res.status(201).json({
      success: true,
      message: `Welcome to BlogVerse, ${user.name}!`,
      prompt: "Your account was created successfully.",
      token: signToken(user),
      user
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message || "Invalid registration details."
      });
    }
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email().toLowerCase(),
      password: z.string().min(1)
    });
    const data = schema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        posts: {
          select: { attachments: { select: { storedName: true } } }
        }
      }
    });

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (user.isBlocked || user.isDisabled) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: user.disabledReason
          ? `This account is disabled: ${user.disabledReason}`
          : "This account has been disabled by an administrator. Contact support for help."
      });
    }

    if (user.deletionScheduledFor && user.deletionScheduledFor <= new Date()) {
      const attachments = user.posts.flatMap((post) => post.attachments);
      await prisma.user.delete({ where: { id: user.id } });
      await removeStoredPostFiles(attachments);
      return res.status(410).json({
        success: false,
        code: "ACCOUNT_DELETED",
        message: "This account passed its 30-day recovery period and has been permanently deleted."
      });
    }

    if (user.deletionScheduledFor) {
      return res.status(409).json({
        success: false,
        code: "ACCOUNT_PENDING_DELETION",
        message: "This account is scheduled for deletion. Recover it to continue signing in.",
        deletionScheduledFor: user.deletionScheduledFor,
        recoveryToken: signAccountRecoveryToken(user)
      });
    }

    const now = new Date();
    const safeUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now, lastSeenAt: now },
      select: safeUserSelect
    });

    res.json({
      success: true,
      message: `Welcome back, ${safeUser.name}!`,
      prompt: "Login successful. Your creator dashboard is ready.",
      token: signToken(safeUser),
      user: safeUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Enter a valid email and password." });
    }
    next(error);
  }
});

router.post("/recover-account", async (req, res, next) => {
  try {
    const { recoveryToken } = z.object({ recoveryToken: z.string().min(20) }).parse(req.body);
    const payload = verifyAccountRecoveryToken(recoveryToken);
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });

    if (!user || user.email !== payload.email) {
      return res.status(404).json({ success: false, message: "The account could not be recovered." });
    }
    if (user.isBlocked || user.isDisabled) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: "This account is disabled and cannot be recovered until an administrator enables it."
      });
    }
    if (!user.deletionScheduledFor) {
      return res.status(400).json({ success: false, message: "This account is not awaiting deletion." });
    }
    if (user.deletionScheduledFor <= new Date()) {
      return res.status(410).json({ success: false, message: "The 30-day recovery period has ended." });
    }

    const now = new Date();
    const recoveredUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        lastLoginAt: now,
        lastSeenAt: now
      },
      select: safeUserSelect
    });

    res.json({
      success: true,
      message: `Welcome back, ${recoveredUser.name}. Your account has been recovered.`,
      prompt: "Account recovery completed successfully.",
      recovered: true,
      token: signToken(recoveredUser),
      user: recoveredUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "A valid recovery request is required." });
    }
    next(error);
  }
});

router.post("/heartbeat", requireAuth, async (req, res, next) => {
  try {
    const lastSeenAt = new Date();
    await prisma.user.update({ where: { id: req.user.id }, data: { lastSeenAt } });
    res.json({ success: true, lastSeenAt });
  } catch (error) {
    next(error);
  }
});

router.post("/offline", async (req, res) => {
  try {
    const token = String(req.body?.token || "");
    if (!token) return res.status(204).end();
    const payload = verifyToken(token);
    if (payload.purpose !== "session") return res.status(204).end();
    await prisma.user.updateMany({
      where: { id: Number(payload.sub) },
      data: { lastSeenAt: null }
    });
    return res.status(204).end();
  } catch {
    return res.status(204).end();
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().trim().email().toLowerCase() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    const response = {
      success: true,
      message: "If an account exists for this email, a password reset link has been prepared."
    };

    if (!user || user.isDisabled || user.isBlocked) return res.json(response);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt } });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${rawToken}`;

    try {
      const mailResult = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
      if (process.env.NODE_ENV !== "production" && !mailResult.sent) {
        response.resetUrl = resetUrl;
        response.developmentNote = "SMTP is not configured, so this test link is shown only in development.";
      }
    } catch (mailError) {
      console.error("Password reset email failed:", mailError.message);
      if (process.env.NODE_ENV !== "production") {
        response.resetUrl = resetUrl;
        response.developmentNote = "Email delivery failed, so this test link is shown only in development.";
      }
    }

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }
    next(error);
  }
});

router.post("/reset-password/:token", async (req, res, next) => {
  try {
    const { password } = z.object({ password: passwordSchema }).parse(req.body);
    const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired."
      });
    }
    if (resetToken.user.isDisabled || resetToken.user.isBlocked) {
      return res.status(403).json({ success: false, message: "This account is disabled." });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: await bcrypt.hash(password, 12) }
      }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId, id: { not: resetToken.id } }
      })
    ]);

    res.json({ success: true, message: "Password updated successfully. You can now sign in." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { lastSeenAt: new Date() },
      select: safeUserSelect
    });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

export default router;
