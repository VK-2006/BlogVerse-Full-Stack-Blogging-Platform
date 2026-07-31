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

function createTicketCode() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `BV-${stamp}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
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
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ticketCode: true,
        subject: true,
        message: true,
        status: true,
        adminReply: true,
        repliedAt: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
        repliedByAdmin: { select: { id: true, name: true, role: true } }
      }
    });

    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
});

export default router;
