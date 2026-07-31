import { Router } from "express";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/post/:postId", optionalAuth, async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, status: true, isBlocked: true }
    });
    const allowed = post && (
      (post.status === "PUBLISHED" && !post.isBlocked)
      || post.authorId === req.userId
      || req.userRole === "ADMIN"
    );
    if (!allowed) return res.status(404).json({ success: false, message: "Post not found or unavailable." });

    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        replies: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, comments });
  } catch (error) {
    next(error);
  }
});

router.post("/post/:postId", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      content: z.string().trim().min(2).max(1000),
      parentId: z.coerce.number().int().positive().optional().nullable()
    });
    const data = schema.parse(req.body);
    const postId = Number(req.params.postId);
    const availablePost = await prisma.post.findFirst({
      where: { id: postId, status: "PUBLISHED", isBlocked: false },
      select: { id: true }
    });
    if (!availablePost) return res.status(404).json({ success: false, message: "Post not found or unavailable." });

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        userId: req.user.id,
        postId,
        parentId: data.parentId || null
      },
      include: { user: { select: { id: true, name: true, avatar: true } } }
    });

    res.status(201).json({ success: true, message: "Comment added.", comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message });
    }
    next(error);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const comment = await prisma.comment.findUnique({ where: { id }, include: { post: true } });
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found." });

    const allowed = comment.userId === req.user.id
      || comment.post.authorId === req.user.id
      || req.user.role === "ADMIN";
    if (!allowed) return res.status(403).json({ success: false, message: "You cannot delete this comment." });

    await prisma.comment.delete({ where: { id } });
    res.json({ success: true, message: "Comment deleted." });
  } catch (error) {
    next(error);
  }
});

export default router;
