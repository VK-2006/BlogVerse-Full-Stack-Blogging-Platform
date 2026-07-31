import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const publicUserSelect = {
  id: true,
  name: true,
  avatar: true,
  bio: true,
  headline: true,
  occupation: true,
  location: true,
  website: true,
  socialLink: true,
  role: true,
  createdAt: true
};

router.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const [posts, drafts, published, blocked, comments, likes, recentPosts, draftPosts] = await Promise.all([
      prisma.post.count({ where: { authorId: req.user.id } }),
      prisma.post.count({ where: { authorId: req.user.id, status: "DRAFT" } }),
      prisma.post.count({ where: { authorId: req.user.id, status: "PUBLISHED" } }),
      prisma.post.count({ where: { authorId: req.user.id, isBlocked: true } }),
      prisma.comment.count({ where: { post: { authorId: req.user.id } } }),
      prisma.like.count({ where: { post: { authorId: req.user.id } } }),
      prisma.post.findMany({
        where: { authorId: req.user.id },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          status: true,
          isBlocked: true,
          blockedReason: true,
          blockedAt: true,
          viewCount: true,
          updatedAt: true,
          _count: { select: { comments: true, likes: true } }
        }
      }),
      prisma.post.findMany({
        where: { authorId: req.user.id, status: "DRAFT" },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          isBlocked: true,
          blockedReason: true,
          blockedAt: true,
          updatedAt: true,
          readTime: true
        }
      })
    ]);

    res.json({ success: true, stats: { posts, drafts, published, blocked, comments, likes }, recentPosts, draftPosts });
  } catch (error) {
    next(error);
  }
});

router.get("/bookmarks", requireAuth, async (req, res, next) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.user.id, post: { status: "PUBLISHED", isBlocked: false } },
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, avatar: true } },
            category: true,
            _count: { select: { comments: true, likes: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, posts: bookmarks.map((item) => item.post) });
  } catch (error) {
    next(error);
  }
});

router.get("/creators", async (_req, res, next) => {
  try {
    const creators = await prisma.user.findMany({
      where: {
        isBlocked: false,
        isDisabled: false,
        deletionScheduledFor: null,
        posts: { some: { status: "PUBLISHED", isBlocked: false } }
      },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      take: 8,
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        role: true,
        _count: {
          select: {
            posts: { where: { status: "PUBLISHED", isBlocked: false } },
            communityPosts: true
          }
        }
      }
    });

    res.json({ success: true, creators });
  } catch (error) {
    next(error);
  }
});

router.get("/account/status", requireAuth, async (req, res, next) => {
  try {
    const account = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        lastLoginAt: true,
        lastSeenAt: true,
        deletionRequestedAt: true,
        deletionScheduledFor: true
      }
    });
    res.json({ success: true, account });
  } catch (error) {
    next(error);
  }
});

router.post("/account/deletion-request", requireAuth, async (req, res, next) => {
  try {
    const data = z.object({
      password: z.string().min(1, "Enter your password."),
      confirmation: z.literal("DELETE", {
        errorMap: () => ({ message: "Type DELETE to confirm account deletion." })
      })
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "The password you entered is incorrect." });
    }

    if (user.role === "ADMIN") {
      const enabledAdmins = await prisma.user.count({
        where: { role: "ADMIN", isDisabled: false, deletionScheduledFor: null }
      });
      if (enabledAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: "The only enabled administrator cannot schedule account deletion. Create or enable another admin first."
        });
      }
    }

    const deletionRequestedAt = new Date();
    const deletionScheduledFor = new Date(deletionRequestedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletionRequestedAt,
        deletionScheduledFor,
        lastSeenAt: null
      }
    });

    res.json({
      success: true,
      message: "Account deletion is scheduled. Sign in within 30 days to recover the account.",
      deletionRequestedAt,
      deletionScheduledFor
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().trim().min(2).max(60),
      headline: z.string().trim().max(120).optional().or(z.literal("")),
      occupation: z.string().trim().max(120).optional().or(z.literal("")),
      location: z.string().trim().max(120).optional().or(z.literal("")),
      website: z.string().url("Website must be a complete URL.").optional().or(z.literal("")),
      socialLink: z.string().url("Social link must be a complete URL.").optional().or(z.literal("")),
      bio: z.string().trim().max(500).optional().or(z.literal("")),
      avatar: z.string().url("Avatar must be a complete URL.").optional().or(z.literal(""))
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: data.name,
        headline: data.headline || null,
        occupation: data.occupation || null,
        location: data.location || null,
        website: data.website || null,
        socialLink: data.socialLink || null,
        bio: data.bio || null,
        avatar: data.avatar || null
      },
      select: {
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
        socialLink: true
      }
    });
    res.json({ success: true, message: "Profile updated successfully.", user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.get("/profile/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid profile id." });
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        isBlocked: false,
        isDisabled: false,
        deletionScheduledFor: null
      },
      select: {
        ...publicUserSelect,
        _count: {
          select: {
            posts: { where: { status: "PUBLISHED", isBlocked: false } },
            comments: true,
            communityPosts: true
          }
        }
      }
    });
    if (!user) return res.status(404).json({ success: false, message: "Profile not found or unavailable." });

    const [posts, communityShares] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: id, status: "PUBLISHED", isBlocked: false },
        orderBy: { publishedAt: "desc" },
        take: 30,
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          category: true,
          _count: { select: { comments: true, likes: true, bookmarks: true } }
        }
      }),
      prisma.communityPost.findMany({
        where: {
          authorId: id,
          OR: [
            { sharedPostId: null },
            { sharedPost: { status: "PUBLISHED", isBlocked: false } }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          content: true,
          createdAt: true,
          sharedPost: {
            select: { id: true, title: true, slug: true, excerpt: true, coverImage: true }
          },
          _count: { select: { replies: true } }
        }
      })
    ]);

    res.json({ success: true, user, posts, communityShares });
  } catch (error) {
    next(error);
  }
});

export default router;
