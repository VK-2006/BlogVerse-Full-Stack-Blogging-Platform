import { Router } from "express";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { emailDeliveryConfigured, sendContactReplyEmail } from "../utils/mailer.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

const ACTIVE_WINDOW_MS = 90 * 1000;
const POST_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function presenceStatus(lastSeenAt) {
  if (!lastSeenAt) return "INACTIVE";
  return Date.now() - new Date(lastSeenAt).getTime() <= ACTIVE_WINDOW_MS ? "ACTIVE" : "INACTIVE";
}

function accountStatus(user) {
  if (user.isBlocked || user.isDisabled) return "DISABLED";
  if (user.deletionScheduledFor) return "PENDING_DELETION";
  return "ENABLED";
}

function parsePage(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

router.get("/overview", async (_req, res, next) => {
  try {
    const activeAfter = new Date(Date.now() - ACTIVE_WINDOW_MS);
    const [
      totalUsers,
      activeUsers,
      disabledUsers,
      pendingDeletionUsers,
      totalPosts,
      publishedPosts,
      draftPosts,
      blockedPosts,
      newContactMessages,
      openContactMessages
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastSeenAt: { gte: activeAfter },
          isBlocked: false,
          isDisabled: false,
          deletionScheduledFor: null
        }
      }),
      prisma.user.count({ where: { OR: [{ isBlocked: true }, { isDisabled: true }] } }),
      prisma.user.count({ where: { deletionScheduledFor: { not: null } } }),
      prisma.post.count(),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "DRAFT" } }),
      prisma.post.count({ where: { isBlocked: true } }),
      prisma.contactMessage.count({ where: { status: "NEW" } }),
      prisma.contactMessage.count({ where: { status: { in: ["NEW", "IN_PROGRESS"] } } })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: Math.max(0, totalUsers - activeUsers),
        disabledUsers,
        pendingDeletionUsers,
        totalPosts,
        publishedPosts,
        draftPosts,
        blockedPosts,
        newContactMessages,
        openContactMessages
      },
      activeWindowSeconds: ACTIVE_WINDOW_MS / 1000
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const page = parsePage(req.query.page);
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 20));
    const status = String(req.query.status || "ALL").toUpperCase();

    const statusWhere = status === "ACTIVE"
      ? { lastSeenAt: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) }, isDisabled: false, isBlocked: false, deletionScheduledFor: null }
      : status === "INACTIVE"
        ? { OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(Date.now() - ACTIVE_WINDOW_MS) } }] }
        : status === "DISABLED"
          ? { OR: [{ isDisabled: true }, { isBlocked: true }] }
          : status === "PENDING_DELETION"
            ? { deletionScheduledFor: { not: null } }
            : {};

    const where = {
      AND: [
        statusWhere,
        ...(search
          ? [{ OR: [{ name: { contains: search } }, { email: { contains: search } }] }]
          : [])
      ]
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ role: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
          isBlocked: true,
          isDisabled: true,
          disabledAt: true,
          disabledReason: true,
          deletionRequestedAt: true,
          deletionScheduledFor: true,
          lastLoginAt: true,
          lastSeenAt: true,
          createdAt: true,
          _count: { select: { posts: true, comments: true, communityPosts: true } }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      users: users.map((user) => ({
        ...user,
        presenceStatus: user.isDisabled || user.isBlocked || user.deletionScheduledFor
          ? "INACTIVE"
          : presenceStatus(user.lastSeenAt),
        accountStatus: accountStatus(user)
      })),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
      activeWindowSeconds: ACTIVE_WINDOW_MS / 1000
    });
  } catch (error) {
    next(error);
  }
});


router.get("/users/:id/posts", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        isDisabled: true,
        isBlocked: true,
        createdAt: true
      }
    });

    if (!creator) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const search = String(req.query.search || "").trim();
    const moderation = String(req.query.moderation || "ALL").toUpperCase();
    const requestedStatus = String(req.query.status || "ALL").toUpperCase();
    const page = parsePage(req.query.page);
    const limit = Math.min(30, Math.max(4, Number(req.query.limit) || 10));

    const where = {
      authorId: userId,
      ...(moderation === "BLOCKED" ? { isBlocked: true } : {}),
      ...(moderation === "VISIBLE" ? { isBlocked: false } : {}),
      ...(POST_STATUSES.includes(requestedStatus) ? { status: requestedStatus } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { excerpt: { contains: search } }
            ]
          }
        : {})
    };

    const [posts, total, totalPosts, publishedPosts, draftPosts, blockedPosts] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ isBlocked: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          status: true,
          isBlocked: true,
          blockedAt: true,
          blockedReason: true,
          blockedByAdminId: true,
          viewCount: true,
          readTime: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { id: true, name: true, slug: true } },
          _count: {
            select: {
              comments: true,
              likes: true,
              bookmarks: true,
              communityShares: true
            }
          }
        }
      }),
      prisma.post.count({ where }),
      prisma.post.count({ where: { authorId: userId } }),
      prisma.post.count({ where: { authorId: userId, status: "PUBLISHED" } }),
      prisma.post.count({ where: { authorId: userId, status: "DRAFT" } }),
      prisma.post.count({ where: { authorId: userId, isBlocked: true } })
    ]);

    res.json({
      success: true,
      creator,
      posts,
      summary: {
        totalPosts,
        publishedPosts,
        draftPosts,
        blockedPosts
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/status", async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const data = z.object({
      disabled: z.boolean(),
      reason: z.string().trim().max(255).optional().or(z.literal(""))
    }).parse(req.body);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }
    if (targetId === req.user.id && data.disabled) {
      return res.status(400).json({ success: false, message: "You cannot disable your own active admin account." });
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ success: false, message: "User not found." });

    if (data.disabled && target.role === "ADMIN") {
      const enabledAdmins = await prisma.user.count({
        where: { role: "ADMIN", isDisabled: false, isBlocked: false, deletionScheduledFor: null }
      });
      if (enabledAdmins <= 1) {
        return res.status(400).json({ success: false, message: "The final enabled administrator cannot be disabled." });
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: data.disabled
        ? {
            isDisabled: true,
            disabledAt: new Date(),
            disabledReason: data.reason || "Disabled by an administrator.",
            lastSeenAt: null
          }
        : {
            isDisabled: false,
            isBlocked: false,
            disabledAt: null,
            disabledReason: null
          },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isDisabled: true,
        isBlocked: true,
        disabledAt: true,
        disabledReason: true,
        deletionScheduledFor: true,
        lastSeenAt: true
      }
    });

    res.json({
      success: true,
      message: data.disabled
        ? `${updated.name}'s account has been disabled.`
        : `${updated.name}'s account has been enabled.`,
      user: {
        ...updated,
        accountStatus: accountStatus(updated),
        presenceStatus: updated.isDisabled ? "INACTIVE" : presenceStatus(updated.lastSeenAt)
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.get("/posts", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const moderation = String(req.query.moderation || "ALL").toUpperCase();
    const requestedStatus = String(req.query.status || "ALL").toUpperCase();
    const page = parsePage(req.query.page);
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 18));

    const where = {
      ...(moderation === "BLOCKED" ? { isBlocked: true } : {}),
      ...(moderation === "VISIBLE" ? { isBlocked: false } : {}),
      ...(POST_STATUSES.includes(requestedStatus) ? { status: requestedStatus } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { excerpt: { contains: search } },
              { author: { name: { contains: search } } },
              { author: { email: { contains: search } } }
            ]
          }
        : {})
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ isBlocked: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          status: true,
          isBlocked: true,
          blockedAt: true,
          blockedReason: true,
          blockedByAdminId: true,
          viewCount: true,
          readTime: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, name: true, email: true, avatar: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { comments: true, likes: true, bookmarks: true, communityShares: true } }
        }
      }),
      prisma.post.count({ where })
    ]);

    res.json({
      success: true,
      posts,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/posts/:id/status", async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const data = z.object({
      blocked: z.boolean(),
      reason: z.string().trim().max(255).optional().or(z.literal(""))
    }).parse(req.body);

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid post id." });
    }

    const existing = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, isBlocked: true }
    });
    if (!existing) return res.status(404).json({ success: false, message: "Post not found." });

    const post = await prisma.post.update({
      where: { id: postId },
      data: data.blocked
        ? {
            isBlocked: true,
            blockedAt: new Date(),
            blockedReason: data.reason || "This post was blocked by an administrator.",
            blockedByAdminId: req.user.id
          }
        : {
            isBlocked: false,
            blockedAt: null,
            blockedReason: null,
            blockedByAdminId: null
          },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        isBlocked: true,
        blockedAt: true,
        blockedReason: true,
        blockedByAdminId: true,
        author: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({
      success: true,
      message: data.blocked
        ? `“${post.title}” has been blocked and removed from public pages.`
        : `“${post.title}” has been unblocked and is public again when published.`,
      post
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.get("/contact-messages", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "ALL").toUpperCase();
    const page = parsePage(req.query.page);
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 12));
    const validStatuses = ["NEW", "IN_PROGRESS", "REPLIED", "CLOSED"];

    const where = {
      ...(validStatuses.includes(status) ? { status } : {}),
      ...(search
        ? {
            OR: [
              { ticketCode: { contains: search } },
              { name: { contains: search } },
              { email: { contains: search } },
              { subject: { contains: search } },
              { message: { contains: search } }
            ]
          }
        : {})
    };

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          ticketCode: true,
          name: true,
          email: true,
          subject: true,
          message: true,
          status: true,
          adminReply: true,
          repliedAt: true,
          closedAt: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true, avatar: true } },
          repliedByAdmin: { select: { id: true, name: true } }
        }
      }),
      prisma.contactMessage.count({ where })
    ]);

    res.json({
      success: true,
      messages,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/contact-messages/:id/reply", async (req, res, next) => {
  try {
    const messageId = Number(req.params.id);
    const data = z.object({
      reply: z.string().trim().min(2).max(5000),
      close: z.boolean().optional().default(false)
    }).parse(req.body);

    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid support message id." });
    }

    const existing = await prisma.contactMessage.findUnique({ where: { id: messageId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Support message not found." });
    }

    const updated = await prisma.contactMessage.update({
      where: { id: messageId },
      data: {
        adminReply: data.reply,
        repliedAt: new Date(),
        repliedByAdminId: req.user.id,
        status: data.close ? "CLOSED" : "REPLIED",
        closedAt: data.close ? new Date() : null
      },
      select: {
        id: true,
        ticketCode: true,
        name: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        adminReply: true,
        repliedAt: true,
        closedAt: true,
        createdAt: true,
        repliedByAdmin: { select: { id: true, name: true } }
      }
    });

    const emailQueued = emailDeliveryConfigured();
    if (emailQueued) {
      void sendContactReplyEmail({
        to: updated.email,
        name: updated.name,
        ticketCode: updated.ticketCode || `BV-LEGACY-${updated.id}`,
        subject: updated.subject,
        reply: updated.adminReply
      })
        .then((emailResult) => {
          if (!emailResult?.sent) console.error("Contact reply email was not sent:", emailResult?.reason || "UNKNOWN");
        })
        .catch((mailError) => console.error("Contact reply email failed:", mailError.message));
    }

    res.json({
      success: true,
      message: emailQueued
        ? `Reply saved in BlogVerse and email queued for ${updated.email}.`
        : "Reply saved in BlogVerse. Configure Brevo email delivery to also send it by email.",
      emailQueued,
      emailSent: false,
      contactMessage: updated
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.patch("/contact-messages/:id/status", async (req, res, next) => {
  try {
    const messageId = Number(req.params.id);
    const data = z.object({
      status: z.enum(["NEW", "IN_PROGRESS", "REPLIED", "CLOSED"])
    }).parse(req.body);

    const contactMessage = await prisma.contactMessage.update({
      where: { id: messageId },
      data: {
        status: data.status,
        closedAt: data.status === "CLOSED" ? new Date() : null
      }
    });

    res.json({ success: true, message: "Support message status updated.", contactMessage });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Support message not found." });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

export default router;
