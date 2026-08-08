import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import {
  signAccountRecoveryToken,
  signToken,
  verifyAccountRecoveryToken,
  verifyToken
} from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { emailDeliveryConfigured, sendPasswordResetOtp } from "../utils/mailer.js";
import { removeStoredPostFiles } from "../utils/fileStorage.js";

const router = Router();
const RESET_OTP_TTL_MINUTES = Math.min(30, Math.max(5, Number(process.env.PASSWORD_RESET_OTP_MINUTES) || 10));
const RESET_SESSION_TTL_MINUTES = Math.min(30, Math.max(5, Number(process.env.PASSWORD_RESET_SESSION_MINUTES) || 10));
const MAX_OTP_ATTEMPTS = 5;
const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many password-reset requests. Please try again in a few minutes." }
});
const passwordResetVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many verification attempts. Please try again later." }
});

function hashResetOtp(userId, otp) {
  return crypto.createHash("sha256").update(String(userId) + ":" + otp).digest("hex");
}

function resetOtpMatches(userId, otp, expectedHash) {
  const actual = Buffer.from(hashResetOtp(userId, otp), "hex");
  const expected = Buffer.from(String(expectedHash || ""), "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

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

router.post("/forgot-password", passwordResetRequestLimiter, async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().trim().email().toLowerCase() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    const emailReady = emailDeliveryConfigured();

    const response = {
      success: true,
      delivery: emailReady ? "queued" : "unavailable",
      requiresOtp: emailReady,
      expiresInMinutes: RESET_OTP_TTL_MINUTES,
      message: emailReady
        ? "If an account exists for this email, a 6-digit password-reset code is being sent."
        : "Password-reset email delivery is not configured on the server yet. Please contact the administrator or try again later."
    };

    if (!user || user.isDisabled || user.isBlocked || !emailReady) return res.json(response);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const otp = String(crypto.randomInt(100000, 1000000));
    const tokenHash = hashResetOtp(user.id, otp);
    const expiresAt = new Date(Date.now() + RESET_OTP_TTL_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt, attempts: 0 }
    });

    void sendPasswordResetOtp({
      to: user.email,
      name: user.name,
      otp,
      expiresMinutes: RESET_OTP_TTL_MINUTES
    })
      .then((mailResult) => {
        if (mailResult?.sent) {
          console.log(`Password reset OTP queued successfully for user ${user.id}.`);
        } else {
          console.error(
            `Password reset OTP was not sent for user ${user.id}: ${mailResult?.reason || "UNKNOWN"}`
          );
        }
      })
      .catch((mailError) => {
        console.error(`Password reset OTP email failed for user ${user.id}:`, mailError.message);
      });

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }
    next(error);
  }
});

router.post("/verify-reset-otp", passwordResetVerifyLimiter, async (req, res, next) => {
  try {
    const { email, otp } = z.object({
      email: z.string().trim().email().toLowerCase(),
      otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email.")
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isDisabled || user.isBlocked) {
      return res.status(400).json({ success: false, message: "The code is invalid or has expired." });
    }

    const resetRequest = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" }
    });

    if (!resetRequest || resetRequest.expiresAt <= new Date() || resetRequest.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(400).json({ success: false, message: "The code is invalid or has expired. Request a new code." });
    }

    if (!resetOtpMatches(user.id, otp, resetRequest.tokenHash)) {
      const nextAttempts = resetRequest.attempts + 1;
      await prisma.passwordResetToken.update({
        where: { id: resetRequest.id },
        data: { attempts: nextAttempts }
      });
      return res.status(400).json({
        success: false,
        message: nextAttempts >= MAX_OTP_ATTEMPTS
          ? "Too many incorrect attempts. Request a new code."
          : "The code is invalid or has expired."
      });
    }

    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");
    const verifiedAt = new Date();
    const expiresAt = new Date(verifiedAt.getTime() + RESET_SESSION_TTL_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.update({
      where: { id: resetRequest.id },
      data: {
        resetTokenHash,
        verifiedAt,
        expiresAt
      }
    });

    res.json({
      success: true,
      message: "Code verified. Create your new password.",
      resetToken: rawResetToken,
      expiresInMinutes: RESET_SESSION_TTL_MINUTES
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message || "Enter a valid verification code." });
    }
    next(error);
  }
});

router.post("/reset-password/:token", passwordResetVerifyLimiter, async (req, res, next) => {
  try {
    const { password } = z.object({ password: passwordSchema }).parse(req.body);
    const resetTokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { resetTokenHash },
      include: { user: true }
    });

    if (!resetToken || !resetToken.verifiedAt || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "This password reset session is invalid or has expired."
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
