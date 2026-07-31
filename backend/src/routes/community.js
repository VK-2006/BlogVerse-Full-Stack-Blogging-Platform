import { Router } from "express";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

const TOPICS = ["GENERAL", "INTRODUCTIONS", "WRITING", "TECHNOLOGY", "CAREER"];
const authorSelect = { id: true, name: true, avatar: true, bio: true };
const sharedPostSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  readTime: true,
  publishedAt: true,
  author: { select: authorSelect },
  category: true,
  _count: { select: { comments: true, likes: true } }
};

const communitySelect = {
  id: true,
  content: true,
  topic: true,
  createdAt: true,
  updatedAt: true,
  author: { select: authorSelect },
  sharedPost: { select: sharedPostSelect },
  replies: {
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      author: { select: authorSelect }
    },
    orderBy: { createdAt: "asc" }
  },
  _count: { select: { replies: true, likes: true } }
};

const createSchema = z.object({
  content: z.string().trim().max(1200).default(""),
  sharedPostId: z.coerce.number().int().positive().optional().nullable(),
  topic: z.enum(TOPICS).default("GENERAL")
}).superRefine((data, context) => {
  if (!data.content && !data.sharedPostId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["content"],
      message: "Write a message or select a published post to share."
    });
  }
});

const updateSchema = z.object({
  content: z.string().trim().min(1).max(1200),
  topic: z.enum(TOPICS).optional()
});

function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function addLikedState(items, userId) {
  if (!userId || !items.length) {
    return items.map((item) => ({ ...item, likedByMe: false }));
  }

  const likedRows = await prisma.communityLike.findMany({
    where: {
      userId,
      communityPostId: { in: items.map((item) => item.id) }
    },
    select: { communityPostId: true }
  });
  const likedIds = new Set(likedRows.map((row) => row.communityPostId));
  return items.map((item) => ({ ...item, likedByMe: likedIds.has(item.id) }));
}

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
    const authorId = parsePositiveInt(req.query.authorId);
    const search = String(req.query.search || "").trim();
    const type = ["all", "discussions", "stories"].includes(String(req.query.type))
      ? String(req.query.type)
      : "all";
    const topic = TOPICS.includes(String(req.query.topic).toUpperCase())
      ? String(req.query.topic).toUpperCase()
      : null;
    const sort = req.query.sort === "popular" ? "popular" : "latest";

    const where = {
      AND: [
        {
          OR: [
            { sharedPostId: null },
            { sharedPost: { status: "PUBLISHED", isBlocked: false } }
          ]
        }
      ],
      ...(authorId ? { authorId } : {}),
      ...(topic ? { topic } : {}),
      ...(type === "stories" ? { sharedPostId: { not: null } } : {}),
      ...(type === "discussions" ? { sharedPostId: null } : {}),
      ...(search ? {
        OR: [
          { content: { contains: search } },
          { author: { name: { contains: search } } },
          { sharedPost: { title: { contains: search } } }
        ]
      } : {})
    };

    const orderBy = sort === "popular"
      ? [{ likes: { _count: "desc" } }, { replies: { _count: "desc" } }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

    const [rawItems, total, totalMembers, totalReplies, totalLikes, sharedStories] = await Promise.all([
      prisma.communityPost.findMany({
        where,
        select: communitySelect,
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.communityPost.count({ where }),
      prisma.user.count({ where: { communityPosts: { some: {} } } }),
      prisma.communityReply.count(),
      prisma.communityLike.count(),
      prisma.communityPost.count({
        where: {
          sharedPostId: { not: null },
          sharedPost: { status: "PUBLISHED", isBlocked: false }
        }
      })
    ]);

    const items = await addLikedState(rawItems, req.userId);

    res.json({
      success: true,
      items,
      currentUserId: req.userId || null,
      stats: {
        members: totalMembers,
        conversations: await prisma.communityPost.count({
          where: {
            OR: [
              { sharedPostId: null },
              { sharedPost: { status: "PUBLISHED", isBlocked: false } }
            ]
          }
        }),
        replies: totalReplies,
        likes: totalLikes,
        stories: sharedStories
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    if (data.sharedPostId) {
      const sharedPost = await prisma.post.findFirst({
        where: { id: data.sharedPostId, status: "PUBLISHED", isBlocked: false },
        select: { id: true }
      });
      if (!sharedPost) {
        return res.status(404).json({ success: false, message: "Published post not found." });
      }
    }

    const item = await prisma.communityPost.create({
      data: {
        content: data.content,
        topic: data.topic,
        authorId: req.user.id,
        sharedPostId: data.sharedPostId || null
      },
      select: communitySelect
    });

    res.status(201).json({
      success: true,
      message: "Shared with the community.",
      item: { ...item, likedByMe: false }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid community post ID." });

    const existing = await prisma.communityPost.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: "Community post not found." });
    if (existing.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "You cannot edit this community post." });
    }

    const data = updateSchema.parse(req.body);
    const item = await prisma.communityPost.update({
      where: { id },
      data: { content: data.content, ...(data.topic ? { topic: data.topic } : {}) },
      select: communitySelect
    });

    const [withLikedState] = await addLikedState([item], req.user.id);
    res.json({ success: true, message: "Community post updated.", item: withLikedState });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.post("/:id/like", requireAuth, async (req, res, next) => {
  try {
    const communityPostId = parsePositiveInt(req.params.id);
    if (!communityPostId) return res.status(400).json({ success: false, message: "Invalid community post ID." });

    const postExists = await prisma.communityPost.findUnique({
      where: { id: communityPostId },
      select: { id: true }
    });
    if (!postExists) return res.status(404).json({ success: false, message: "Community post not found." });

    const where = { userId_communityPostId: { userId: req.user.id, communityPostId } };
    const existing = await prisma.communityLike.findUnique({ where });

    if (existing) await prisma.communityLike.delete({ where });
    else await prisma.communityLike.create({ data: { userId: req.user.id, communityPostId } });

    const count = await prisma.communityLike.count({ where: { communityPostId } });
    res.json({ success: true, liked: !existing, count });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/replies", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({ content: z.string().trim().min(1).max(600) });
    const data = schema.parse(req.body);
    const communityPostId = parsePositiveInt(req.params.id);
    if (!communityPostId) return res.status(400).json({ success: false, message: "Invalid community post ID." });

    const exists = await prisma.communityPost.findUnique({
      where: { id: communityPostId },
      select: { id: true }
    });
    if (!exists) return res.status(404).json({ success: false, message: "Community post not found." });

    const reply = await prisma.communityReply.create({
      data: { content: data.content, authorId: req.user.id, communityPostId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: authorSelect }
      }
    });

    res.status(201).json({ success: true, message: "Reply added.", reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.put("/replies/:replyId", requireAuth, async (req, res, next) => {
  try {
    const replyId = parsePositiveInt(req.params.replyId);
    if (!replyId) return res.status(400).json({ success: false, message: "Invalid reply ID." });
    const data = z.object({ content: z.string().trim().min(1).max(600) }).parse(req.body);

    const existing = await prisma.communityReply.findUnique({ where: { id: replyId } });
    if (!existing) return res.status(404).json({ success: false, message: "Reply not found." });
    if (existing.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "You cannot edit this reply." });
    }

    const reply = await prisma.communityReply.update({
      where: { id: replyId },
      data: { content: data.content },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: authorSelect }
      }
    });

    res.json({ success: true, message: "Reply updated.", reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.delete("/replies/:replyId", requireAuth, async (req, res, next) => {
  try {
    const replyId = parsePositiveInt(req.params.replyId);
    if (!replyId) return res.status(400).json({ success: false, message: "Invalid reply ID." });

    const existing = await prisma.communityReply.findUnique({ where: { id: replyId } });
    if (!existing) return res.status(404).json({ success: false, message: "Reply not found." });
    if (existing.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "You cannot delete this reply." });
    }

    await prisma.communityReply.delete({ where: { id: replyId } });
    res.json({ success: true, message: "Reply deleted." });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid community post ID." });

    const item = await prisma.communityPost.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, message: "Community post not found." });
    if (item.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "You cannot delete this community post." });
    }

    await prisma.communityPost.delete({ where: { id } });
    res.json({ success: true, message: "Community post deleted." });
  } catch (error) {
    next(error);
  }
});

export default router;
