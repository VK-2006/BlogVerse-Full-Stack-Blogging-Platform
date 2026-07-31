import "dotenv/config";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertUser({
  name,
  email,
  passwordHash,
  bio,
  role = "USER",
  avatar = null,
  headline = null,
  occupation = null,
  location = null,
  website = null,
  socialLink = null
}) {
  const profile = { name, bio, avatar, headline, occupation, location, website, socialLink };
  return prisma.user.upsert({
    where: { email },
    update: profile,
    create: { ...profile, email, passwordHash, role }
  });
}

async function upsertPost(data) {
  return prisma.post.upsert({
    where: { slug: data.slug },
    update: {
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: data.coverImage,
      status: "PUBLISHED",
      publishedAt: data.publishedAt,
      authorId: data.authorId,
      categoryId: data.categoryId,
      readTime: data.readTime
    },
    create: { ...data, status: "PUBLISHED" }
  });
}

async function ensureCommunityPost({ content, authorId, sharedPostId = null, topic = "GENERAL" }) {
  const existing = await prisma.communityPost.findFirst({ where: { content, authorId } });
  if (existing) {
    return prisma.communityPost.update({
      where: { id: existing.id },
      data: { sharedPostId, topic }
    });
  }
  return prisma.communityPost.create({ data: { content, authorId, sharedPostId, topic } });
}

async function ensureReply({ content, authorId, communityPostId }) {
  const existing = await prisma.communityReply.findFirst({ where: { content, authorId, communityPostId } });
  if (existing) return existing;
  return prisma.communityReply.create({ data: { content, authorId, communityPostId } });
}

async function ensureComment({ content, userId, postId }) {
  const existing = await prisma.comment.findFirst({ where: { content, userId, postId } });
  if (existing) return existing;
  return prisma.comment.create({ data: { content, userId, postId } });
}

async function main() {
  const creatorName = process.env.PROJECT_CREATOR_NAME?.trim() || "Venkat Kiran";
  const adminPasswordHash = await bcrypt.hash("Admin@123", 12);
  const writerPasswordHash = await bcrypt.hash("Writer@123", 12);

  const admin = await upsertUser({
    name: creatorName,
    email: "admin@blogverse.com",
    passwordHash: adminPasswordHash,
    role: "ADMIN",
    bio: "Founder and creator of BlogVerse, sharing practical ideas about technology, learning and creative work.",
    headline: "Founder building thoughtful digital communities",
    occupation: "Full-Stack Developer & Creator",
    location: "India",
    website: "https://blogverse.local"
  });

  const ananya = await upsertUser({
    name: "Ananya Sharma",
    email: "ananya@blogverse.com",
    passwordHash: writerPasswordHash,
    bio: "Learning strategist writing about better study systems, careers and confident communication.",
    headline: "Helping students learn with clarity and confidence",
    occupation: "Learning Strategist",
    location: "Bengaluru, India"
  });

  const arjun = await upsertUser({
    name: "Arjun Rao",
    email: "arjun@blogverse.com",
    passwordHash: writerPasswordHash,
    bio: "Full-stack developer documenting real project lessons, debugging habits and software craftsmanship.",
    headline: "Building reliable full-stack products",
    occupation: "Software Developer",
    location: "Hyderabad, India"
  });

  const maya = await upsertUser({
    name: "Maya Patel",
    email: "maya@blogverse.com",
    passwordHash: writerPasswordHash,
    bio: "Product designer exploring creativity, thoughtful interfaces and sustainable productivity.",
    headline: "Designing calm and useful digital experiences",
    occupation: "Product Designer",
    location: "Mumbai, India"
  });

  const categories = [
    ["Technology", "Software, AI, web development and digital innovation."],
    ["Lifestyle", "Ideas for better living, habits and personal growth."],
    ["Education", "Learning resources, career guidance and practical tutorials."],
    ["Business", "Entrepreneurship, marketing, teamwork and leadership."],
    ["Design", "User experience, visual thinking and creative problem solving."],
    ["Career", "Skills, interviews, communication and professional growth."]
  ];

  for (const [name, description] of categories) {
    await prisma.category.upsert({
      where: { slug: slugify(name, { lower: true }) },
      update: { name, description },
      create: { name, slug: slugify(name, { lower: true }), description }
    });
  }

  const categoryRows = await prisma.category.findMany();
  const categoryBySlug = Object.fromEntries(categoryRows.map((category) => [category.slug, category]));
  const now = Date.now();

  const posts = [];
  posts.push(await upsertPost({
    title: "Welcome to BlogVerse: A Better Place for Ideas",
    slug: "welcome-to-blogverse",
    excerpt: "A modern space to publish useful ideas, discover meaningful stories and connect with thoughtful readers.",
    content: `<h2>A place for ideas</h2><p>BlogVerse is a complete full-stack blogging platform created for writers, readers and communities.</p><p>You can register, save drafts, publish articles, comment, like, bookmark and share stories with the community.</p><h3>Start writing today</h3><p>Open the dashboard, create your first article and share what you have learned with the world.</p>`,
    coverImage: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=80",
    publishedAt: new Date(now - 1 * 60 * 60 * 1000),
    authorId: admin.id,
    categoryId: categoryBySlug.technology.id,
    readTime: 3
  }));

  posts.push(await upsertPost({
    title: "Seven Habits That Make Learning Faster and Less Stressful",
    slug: "seven-habits-for-faster-learning",
    excerpt: "A realistic learning system built around active recall, small feedback loops and focused practice.",
    content: `<h2>Learning needs a system</h2><p>Motivation is useful, but a repeatable system is more reliable. Start with a small daily target and make progress visible.</p><h3>Use active recall</h3><p>Close the book and explain the idea in your own words. The struggle to retrieve information strengthens memory.</p><h3>Review your mistakes</h3><p>Keep a small error log. Your repeated mistakes reveal exactly what deserves the next practice session.</p>`,
    coverImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1400&q=80",
    publishedAt: new Date(now - 6 * 60 * 60 * 1000),
    authorId: ananya.id,
    categoryId: categoryBySlug.education.id,
    readTime: 6
  }));

  posts.push(await upsertPost({
    title: "What Building a Full-Stack Project Taught Me About Debugging",
    slug: "full-stack-project-debugging-lessons",
    excerpt: "The practical debugging checklist I wish I had before connecting a React frontend to an Express API.",
    content: `<h2>Debug the boundary first</h2><p>Most full-stack bugs happen where two systems meet: browser and API, API and database, or environment and deployment.</p><h3>Read the network request</h3><p>Check the method, URL, request body and response status before changing code. A 400 response needs a different investigation than a 500 response.</p><h3>Make errors useful</h3><p>Return field-level validation messages and log enough context to reproduce the problem without exposing sensitive data.</p>`,
    coverImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80",
    publishedAt: new Date(now - 24 * 60 * 60 * 1000),
    authorId: arjun.id,
    categoryId: categoryBySlug.technology.id,
    readTime: 7
  }));

  posts.push(await upsertPost({
    title: "Designing Interfaces That Feel Calm, Clear and Intentional",
    slug: "designing-calm-clear-interfaces",
    excerpt: "How spacing, contrast, motion and hierarchy work together to make a product feel easier to use.",
    content: `<h2>Clarity before decoration</h2><p>A polished interface begins with a clear content hierarchy. Users should understand the next action before noticing the visual effects.</p><h3>Use motion with purpose</h3><p>Transitions should explain change, confirm an action or guide attention. Small consistent movements feel more professional than constant animation.</p><h3>Create breathing room</h3><p>Spacing separates ideas, improves scanning and helps important elements feel important.</p>`,
    coverImage: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1400&q=80",
    publishedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
    authorId: maya.id,
    categoryId: categoryBySlug.design.id,
    readTime: 5
  }));

  posts.push(await upsertPost({
    title: "A Beginner-Friendly Roadmap for Learning React and Node.js",
    slug: "react-nodejs-learning-roadmap",
    excerpt: "A step-by-step roadmap for moving from JavaScript basics to a deployable full-stack application.",
    content: `<h2>Start with JavaScript fundamentals</h2><p>Learn functions, arrays, objects, modules, promises and async-await before trying to memorize framework APIs.</p><h3>Build one feature end to end</h3><p>Create a form in React, send it to Express, validate the request and save it to a database. This teaches the full request lifecycle.</p><h3>Add authentication last</h3><p>After basic CRUD works, add password hashing, JWT authentication and protected routes.</p>`,
    coverImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1400&q=80",
    publishedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
    authorId: arjun.id,
    categoryId: categoryBySlug.education.id,
    readTime: 8
  }));

  posts.push(await upsertPost({
    title: "How to Speak About Your Project With Confidence",
    slug: "speak-about-your-project-with-confidence",
    excerpt: "A simple structure for explaining your problem, solution, architecture and contribution during a review or interview.",
    content: `<h2>Begin with the problem</h2><p>Explain who faces the problem, why it matters and what existing approaches fail to handle well.</p><h3>Describe the flow</h3><p>Walk through input, processing, storage and output. Use one concrete user scenario instead of listing technologies without context.</p><h3>State your contribution</h3><p>Clearly separate what already existed from the feature, integration or improvement you personally added.</p>`,
    coverImage: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1400&q=80",
    publishedAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
    authorId: ananya.id,
    categoryId: categoryBySlug.career.id,
    readTime: 5
  }));

  posts.push(await upsertPost({
    title: "A Sustainable Productivity System for Creative Work",
    slug: "sustainable-productivity-for-creative-work",
    excerpt: "Replace endless task lists with three priorities, protected focus blocks and a weekly reflection habit.",
    content: `<h2>Protect your best attention</h2><p>Schedule important creative work during the part of the day when your energy is naturally strongest.</p><h3>Limit active priorities</h3><p>Too many priorities create constant switching. Choose three meaningful outcomes for the week and let smaller tasks support them.</p><h3>Review without judging</h3><p>A weekly review should help you learn what worked, not create guilt about what did not.</p>`,
    coverImage: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1400&q=80",
    publishedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
    authorId: maya.id,
    categoryId: categoryBySlug.lifestyle.id,
    readTime: 6
  }));

  const [welcome, learning, debugging, design, roadmap, confidence, productivity] = posts;

  const likePairs = [
    [ananya.id, welcome.id], [arjun.id, welcome.id], [maya.id, welcome.id],
    [admin.id, learning.id], [arjun.id, learning.id], [maya.id, learning.id],
    [admin.id, debugging.id], [ananya.id, debugging.id], [maya.id, debugging.id],
    [admin.id, design.id], [ananya.id, design.id], [arjun.id, design.id],
    [admin.id, roadmap.id], [ananya.id, roadmap.id],
    [admin.id, confidence.id], [maya.id, confidence.id],
    [admin.id, productivity.id], [arjun.id, productivity.id]
  ];
  for (const [userId, postId] of likePairs) {
    await prisma.like.upsert({ where: { userId_postId: { userId, postId } }, update: {}, create: { userId, postId } });
  }

  await ensureComment({ content: "The request-lifecycle explanation makes debugging much easier to understand.", userId: ananya.id, postId: debugging.id });
  await ensureComment({ content: "I especially liked the idea that motion should explain change, not just decorate the page.", userId: arjun.id, postId: design.id });
  await ensureComment({ content: "This roadmap gives beginners a clear order instead of a huge list of technologies.", userId: maya.id, postId: roadmap.id });
  await ensureComment({ content: "The problem-flow-contribution structure is perfect for project reviews.", userId: admin.id, postId: confidence.id });

  const community1 = await ensureCommunityPost({
    content: "What is one debugging habit that saved you hours on a recent project? I now check the browser network request before changing any code.",
    authorId: arjun.id,
    sharedPostId: debugging.id,
    topic: "TECHNOLOGY"
  });
  const community2 = await ensureCommunityPost({
    content: "A small learning challenge for this week: explain one difficult concept in your own words and share the explanation with someone.",
    authorId: ananya.id,
    sharedPostId: learning.id,
    topic: "CAREER"
  });
  const community3 = await ensureCommunityPost({
    content: "Which UI detail makes a website feel professional to you: spacing, typography, motion or colour? For me, consistent spacing changes everything.",
    authorId: maya.id,
    sharedPostId: design.id,
    topic: "WRITING"
  });
  const community4 = await ensureCommunityPost({
    content: "Welcome to the BlogVerse community. Introduce yourself with the topic you enjoy writing or learning about.",
    authorId: admin.id,
    sharedPostId: welcome.id,
    topic: "INTRODUCTIONS"
  });
  const community5 = await ensureCommunityPost({
    content: "Students: what is the hardest part of explaining your project during a review? Architecture, objectives or your original contribution?",
    authorId: ananya.id,
    sharedPostId: confidence.id,
    topic: "CAREER"
  });

  await ensureReply({ content: "Writing the request and response payload in a small note before coding has helped me a lot.", authorId: maya.id, communityPostId: community1.id });
  await ensureReply({ content: "I also check environment variables early. A wrong API URL can look like a frontend bug.", authorId: admin.id, communityPostId: community1.id });
  await ensureReply({ content: "I am trying this with JWT authentication today.", authorId: arjun.id, communityPostId: community2.id });
  await ensureReply({ content: "Typography and spacing first, then motion for feedback.", authorId: admin.id, communityPostId: community3.id });
  await ensureReply({ content: "I enjoy writing about full-stack projects and the bugs I solve while building them.", authorId: arjun.id, communityPostId: community4.id });
  await ensureReply({ content: "My biggest challenge is clearly explaining what is new in my project.", authorId: maya.id, communityPostId: community5.id });

  const communityLikePairs = [
    [admin.id, community1.id], [ananya.id, community1.id], [maya.id, community1.id],
    [admin.id, community2.id], [arjun.id, community2.id],
    [admin.id, community3.id], [ananya.id, community3.id],
    [ananya.id, community4.id], [arjun.id, community4.id], [maya.id, community4.id],
    [admin.id, community5.id], [arjun.id, community5.id]
  ];
  for (const [userId, communityPostId] of communityLikePairs) {
    await prisma.communityLike.upsert({
      where: { userId_communityPostId: { userId, communityPostId } },
      update: {},
      create: { userId, communityPostId }
    });
  }

  await prisma.contactMessage.upsert({
    where: { ticketCode: "BV-DEMO-0001" },
    update: {},
    create: {
      ticketCode: "BV-DEMO-0001",
      name: "Ananya Sharma",
      email: "ananya@blogverse.com",
      subject: "How can I improve my article formatting?",
      message: "I published a draft and would like guidance on headings, spacing and cover images before making it public.",
      status: "NEW",
      userId: ananya.id
    }
  });

  console.log("Database seeded successfully with rich demo content.");
  console.log("Admin: admin@blogverse.com / Admin@123");
  console.log("Demo writers: ananya@blogverse.com, arjun@blogverse.com, maya@blogverse.com / Writer@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
