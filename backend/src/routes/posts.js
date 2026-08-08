import { Router } from "express";
import slugify from "slugify";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { removeStoredPostFiles } from "../utils/fileStorage.js";
import { buildPostDownloadHtml } from "../utils/postDownload.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const postSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImage: true,
  status: true,
  isBlocked: true,
  blockedAt: true,
  blockedReason: true,
  blockedByAdminId: true,
  viewCount: true,
  readTime: true,
  downloadEnabled: true,
  downloadCount: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, avatar: true, bio: true } },
  category: true,
  tags: { include: { tag: true } },
  attachments: true,
  links: true,
  _count: { select: { comments: true, likes: true, bookmarks: true } }
};

const attachmentSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  storedName: z.string().trim().min(1).max(255),
  url: z.string().url().refine(isHttpUrl, "Attachment URL must use http:// or https://."),
  mimeType: z.string().trim().min(1).max(150),
  size: z.coerce.number().int().nonnegative().max(10 * 1024 * 1024)
});

const linkSchema = z.object({
  label: z.string().trim().max(100).optional().nullable(),
  url: z.string().url("Each related link must be a complete URL beginning with http:// or https://.").refine(isHttpUrl, "Each related link must use http:// or https://.")
});

const postSchema = z.object({
  title: z.string().trim().min(1, "Enter a post title.").max(180),
  excerpt: z.string().trim().max(500).default(""),
  content: z.string().trim().default(""),
  coverImage: z.string().url("Cover image must be a complete URL.").refine(isHttpUrl, "Cover image must use http:// or https://.").optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  downloadEnabled: z.boolean().optional(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  attachments: z.array(attachmentSchema).max(10).default([]),
  links: z.array(linkSchema).max(10).default([])
}).superRefine((data, context) => {
  if (data.status !== "PUBLISHED") return;

  if (data.title.length < 3) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["title"], message: "Published title must contain at least 3 characters." });
  }
  if (data.excerpt.length < 10) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["excerpt"], message: "Published summary must contain at least 10 characters." });
  }
  const plainContent = data.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plainContent.length < 20) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["content"], message: "Published story must contain at least 20 characters." });
  }
});

function calculateReadTime(content) {
  const plain = content.replace(/<[^>]*>/g, " ").trim();
  if (!plain) return 1;
  return Math.max(1, Math.ceil(plain.split(/\s+/).length / 200));
}

function uniqueTagNames(tags) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

async function uniqueSlug(title, excludeId) {
  const base = slugify(title, { lower: true, strict: true, trim: true }) || `post-${Date.now()}`;
  let slug = base;
  let counter = 1;

  while (await prisma.post.findFirst({
    where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }
  })) {
    slug = `${base}-${counter++}`;
  }

  return slug;
}

function validationResponse(error, res) {
  const fields = Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] || "form"), issue.message]));
  return res.status(400).json({
    success: false,
    message: error.issues[0]?.message || "Please correct the highlighted fields.",
    fields
  });
}

router.get("/meta/categories", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
});

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 9));
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const authorId = Number(req.query.authorId) || undefined;
    const mine = req.query.mine === "true";
    const requestedStatus = String(req.query.status || "").toUpperCase();
    const validStatus = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(requestedStatus) ? requestedStatus : null;

    const where = {
      ...((mine && req.userId)
        ? (validStatus ? { status: validStatus } : {})
        : { status: "PUBLISHED", isBlocked: false }),
      ...(mine && req.userId ? { authorId: req.userId } : {}),
      ...(authorId ? { authorId } : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search } },
          { excerpt: { contains: search } },
          { content: { contains: search } }
        ]
      } : {})
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: postSelect,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.post.count({ where })
    ]);

    res.json({
      success: true,
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});


router.get("/manage/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const post = await prisma.post.findUnique({ where: { id }, select: postSelect });
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (post.author.id !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "You cannot edit this post." });
    }
    res.json({ success: true, post });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/download", optionalAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid post id." });
    }

    const post = await prisma.post.findUnique({ where: { id }, select: postSelect });
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });

    const isOwner = post.author.id === req.userId;
    const isAdmin = req.userRole === "ADMIN";
    const publiclyVisible = post.status === "PUBLISHED" && !post.isBlocked;

    if (!publiclyVisible && !isOwner && !isAdmin) {
      return res.status(404).json({ success: false, message: "Post not found or unavailable." });
    }
    if (!post.downloadEnabled && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, code: "DOWNLOAD_DISABLED", message: "The author has disabled downloads for this story." });
    }

    const html = buildPostDownloadHtml(post);
    await prisma.post.update({ where: { id: post.id }, data: { downloadCount: { increment: 1 } } });

    const filename = `${post.slug || `blogverse-post-${post.id}`}.html`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(html);
  } catch (error) {
    next(error);
  }
});

router.get("/:slug", optionalAuth, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { slug: req.params.slug }, select: postSelect });

    const isOwner = post?.author.id === req.userId;
    const isAdmin = req.userRole === "ADMIN";
    if (!post || (post.status !== "PUBLISHED" && !isOwner && !isAdmin) || (post.isBlocked && !isOwner && !isAdmin)) {
      return res.status(404).json({ success: false, message: "Post not found or unavailable." });
    }

    if (post.status === "PUBLISHED" && !post.isBlocked) {
      await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });
      post.viewCount += 1;
    }

    let liked = false;
    let bookmarked = false;
    if (req.userId) {
      const [like, bookmark] = await Promise.all([
        prisma.like.findUnique({ where: { userId_postId: { userId: req.userId, postId: post.id } } }),
        prisma.bookmark.findUnique({ where: { userId_postId: { userId: req.userId, postId: post.id } } })
      ]);
      liked = Boolean(like);
      bookmarked = Boolean(bookmark);
    }

    const canDownload = Boolean(post.downloadEnabled || isOwner || isAdmin);
    res.json({ success: true, post, liked, bookmarked, canDownload });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = postSchema.parse(req.body);
    const slug = await uniqueSlug(data.title);
    const tags = uniqueTagNames(data.tags);

    const post = await prisma.post.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        coverImage: data.coverImage || null,
        status: data.status,
        publishedAt: data.status === "PUBLISHED" ? new Date() : null,
        readTime: calculateReadTime(data.content),
        downloadEnabled: data.downloadEnabled ?? true,
        authorId: req.user.id,
        categoryId: data.categoryId || null,
        attachments: { create: data.attachments },
        links: { create: data.links.map((link) => ({ label: link.label || null, url: link.url })) },
        tags: {
          create: tags.map((name) => ({
            tag: {
              connectOrCreate: {
                where: { slug: slugify(name, { lower: true, strict: true }) },
                create: { name, slug: slugify(name, { lower: true, strict: true }) }
              }
            }
          }))
        }
      },
      select: postSelect
    });

    res.status(201).json({ success: true, message: "Post created successfully.", post });
  } catch (error) {
    if (error instanceof z.ZodError) return validationResponse(error, res);
    next(error);
  }
});

router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.post.findUnique({ where: { id } });

    if (!existing) return res.status(404).json({ success: false, message: "Post not found." });
    if (existing.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "You cannot edit this post." });
    }

    const data = postSchema.parse(req.body);
    if (existing.isBlocked && data.status === "PUBLISHED" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        code: "POST_BLOCKED",
        message: existing.blockedReason || "This post is blocked by an administrator and cannot be published."
      });
    }
    const slug = data.title !== existing.title ? await uniqueSlug(data.title, id) : existing.slug;
    const tags = uniqueTagNames(data.tags);

    const post = await prisma.$transaction(async (transaction) => {
      await transaction.postTag.deleteMany({ where: { postId: id } });
      await transaction.postAttachment.deleteMany({ where: { postId: id } });
      await transaction.postLink.deleteMany({ where: { postId: id } });

      return transaction.post.update({
        where: { id },
        data: {
          title: data.title,
          slug,
          excerpt: data.excerpt,
          content: data.content,
          coverImage: data.coverImage || null,
          categoryId: data.categoryId || null,
          status: data.status,
          publishedAt: data.status === "PUBLISHED" ? existing.publishedAt || new Date() : null,
          readTime: calculateReadTime(data.content),
          downloadEnabled: data.downloadEnabled ?? existing.downloadEnabled,
          attachments: { create: data.attachments },
          links: { create: data.links.map((link) => ({ label: link.label || null, url: link.url })) },
          tags: {
            create: tags.map((name) => ({
              tag: {
                connectOrCreate: {
                  where: { slug: slugify(name, { lower: true, strict: true }) },
                  create: { name, slug: slugify(name, { lower: true, strict: true }) }
                }
              }
            }))
          }
        },
        select: postSelect
      });
    });

    res.json({ success: true, message: "Post updated successfully.", post });
  } catch (error) {
    if (error instanceof z.ZodError) return validationResponse(error, res);
    next(error);
  }
});


router.patch("/:id/publish", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.post.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } }, attachments: true, links: true }
    });
    if (!existing) return res.status(404).json({ success: false, message: "Draft not found." });
    if (existing.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "You cannot publish this draft." });
    }
    if (existing.isBlocked && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        code: "POST_BLOCKED",
        message: existing.blockedReason || "This post is blocked by an administrator and cannot be published."
      });
    }

    postSchema.parse({
      title: existing.title,
      excerpt: existing.excerpt,
      content: existing.content,
      coverImage: existing.coverImage || "",
      status: "PUBLISHED",
      categoryId: existing.categoryId,
      tags: existing.tags.map((item) => item.tag.name),
      attachments: existing.attachments,
      links: existing.links
    });

    const post = await prisma.post.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: existing.publishedAt || new Date() },
      select: postSelect
    });
    res.json({ success: true, message: "Draft published successfully.", post });
  } catch (error) {
    if (error instanceof z.ZodError) return validationResponse(error, res);
    next(error);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const post = await prisma.post.findUnique({
      where: { id },
      include: { attachments: { select: { storedName: true } } }
    });
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (post.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "You cannot delete this post." });
    }

    await prisma.post.delete({ where: { id } });
    await removeStoredPostFiles(post.attachments);

    res.json({
      success: true,
      hardDeleted: true,
      message: "Post and all related database records were permanently deleted."
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/like", requireAuth, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const availablePost = await prisma.post.findFirst({
      where: { id: postId, status: "PUBLISHED", isBlocked: false },
      select: { id: true }
    });
    if (!availablePost) return res.status(404).json({ success: false, message: "Post not found or unavailable." });
    const where = { userId_postId: { userId: req.user.id, postId } };
    const existing = await prisma.like.findUnique({ where });
    if (existing) await prisma.like.delete({ where });
    else await prisma.like.create({ data: { userId: req.user.id, postId } });
    const count = await prisma.like.count({ where: { postId } });
    res.json({ success: true, liked: !existing, count });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/bookmark", requireAuth, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const availablePost = await prisma.post.findFirst({
      where: { id: postId, status: "PUBLISHED", isBlocked: false },
      select: { id: true }
    });
    if (!availablePost) return res.status(404).json({ success: false, message: "Post not found or unavailable." });
    const where = { userId_postId: { userId: req.user.id, postId } };
    const existing = await prisma.bookmark.findUnique({ where });
    if (existing) await prisma.bookmark.delete({ where });
    else await prisma.bookmark.create({ data: { userId: req.user.id, postId } });
    res.json({ success: true, bookmarked: !existing });
  } catch (error) {
    next(error);
  }
});

export default router;
