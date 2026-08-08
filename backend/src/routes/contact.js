import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import prisma from "../utils/prisma.js";

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  subject: z.string().trim().min(3).max(140),
  message: z.string().trim().min(10).max(3000)
});

const followUpSchema = z.object({
  message: z.string().trim().min(2, "Write a response before sending.").max(3000)
});

const threadEntrySelect = {
  id: true,
  actor: true,
  senderUserId: true,
  senderName: true,
  message: true,
  createdAt: true
};

function createTicketCode() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `BV-${stamp}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function ensureLegacyAdminReply(transaction, contact) {
  if (!contact.adminReply || contact.threadEntries?.some((entry) => entry.actor === "ADMIN")) return;

  await transaction.contactThreadEntry.create({
    data: {
      contactMessageId: contact.id,
      actor: "ADMIN",
      senderUserId: contact.repliedByAdminId || null,
      senderName: contact.repliedByAdmin?.name || "BlogVerse Administrator",
      message: contact.adminReply,
      createdAt: contact.repliedAt || contact.updatedAt || new Date()
    }
  });
}

router.post("/", optionalAuth, async (req, res, next) => {
  try {
    const data = contactSchema.parse(req.body);
    let ticketCode = createTicketCode();

    while (await prisma.contactMessage.findUnique({ where: { ticketCode } })) {
      ticketCode = createTicketCode();
    }

    const contact = await prisma.contactMessage.create({
      data: {
        ...data,
        ticketCode,
        userId: req.userId || null
      },
      select: {
        id: true,
        ticketCode: true,
        status: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: "Your message has reached the BlogVerse support inbox.",
      contact
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message || "Please check the contact form."
      });
    }
    next(error);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: "desc" },
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
        repliedByAdmin: { select: { id: true, name: true, role: true } },
        threadEntries: { orderBy: { createdAt: "asc" }, select: threadEntrySelect }
      }
    });

    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/reply", requireAuth, async (req, res, next) => {
  try {
    const messageId = Number(req.params.id);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid support ticket id." });
    }

    const data = followUpSchema.parse(req.body);
    const existing = await prisma.contactMessage.findFirst({
      where: { id: messageId, userId: req.user.id },
      include: {
        threadEntries: { select: { id: true, actor: true } },
        repliedByAdmin: { select: { id: true, name: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Support ticket not found." });
    }

    const entry = await prisma.$transaction(async (transaction) => {
      await ensureLegacyAdminReply(transaction, existing);

      const created = await transaction.contactThreadEntry.create({
        data: {
          contactMessageId: existing.id,
          actor: "USER",
          senderUserId: req.user.id,
          senderName: req.user.name,
          message: data.message
        },
        select: threadEntrySelect
      });

      await transaction.contactMessage.update({
        where: { id: existing.id },
        data: {
          status: "NEW",
          closedAt: null
        }
      });

      return created;
    });

    res.status(201).json({
      success: true,
      message: existing.status === "CLOSED"
        ? "Your response reopened the ticket and returned it to the administrator inbox."
        : "Your response was added to the ticket and returned to the administrator inbox.",
      entry
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues[0]?.message || "Check your response." });
    }
    next(error);
  }
});

export default router;
