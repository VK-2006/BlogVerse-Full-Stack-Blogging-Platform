import prisma from "../utils/prisma.js";
import { verifyToken } from "../utils/jwt.js";

const authUserSelect = {
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
  isBlocked: true,
  isDisabled: true,
  disabledReason: true,
  deletionRequestedAt: true,
  deletionScheduledFor: true,
  lastLoginAt: true,
  lastSeenAt: true
};

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const payload = verifyToken(token);
    if (payload.purpose && payload.purpose !== "session") {
      return res.status(401).json({ success: false, message: "Invalid session token." });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: authUserSelect
    });

    if (!user) {
      return res.status(401).json({ success: false, code: "ACCOUNT_UNAVAILABLE", message: "Account is unavailable." });
    }
    if (user.isBlocked || user.isDisabled) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: user.disabledReason
          ? `This account is disabled: ${user.disabledReason}`
          : "This account has been disabled by an administrator."
      });
    }
    if (user.deletionScheduledFor) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_PENDING_DELETION",
        message: "This account is scheduled for deletion. Sign in again to recover it."
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { id: true, role: true, isBlocked: true, isDisabled: true, deletionScheduledFor: true }
    });
    const available = user && !user.isBlocked && !user.isDisabled && !user.deletionScheduledFor;
    req.userId = available ? user.id : null;
    req.userRole = available ? user.role : null;
  } catch {
    req.userId = null;
  }

  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission." });
    }
    next();
  };
}
