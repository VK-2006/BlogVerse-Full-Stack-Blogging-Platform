# BlogVerse — Full-Stack Blogging Platform

**Student:** D. VENKATA KIRAN  
**Project:** Full Stack Blogging Platform Development Project

BlogVerse is a responsive full-stack blogging and creator-community platform built with React, Vite, Node.js, Express, Prisma and MySQL.

## Technology stack

- Frontend: React 19 + Vite
- Backend: Node.js + Express
- Database: MySQL
- ORM: Prisma
- Authentication: JWT + bcrypt
- Email: Brevo Transactional Email API
- Icons: Lucide React

## Main features

- Register, login, logout and password reset
- User profiles and creator details
- Create, save, edit, publish and delete posts
- Draft management
- Comments, likes and bookmarks
- Communities, replies and shared stories
- Light and dark themes
- Admin user enable/disable controls
- Admin post block/unblock moderation
- Account deletion with a 30-day recovery window
- Active/inactive user presence
- Contact support tickets
- Admin support inbox and replies
- Responsive mobile, tablet and desktop UI

## Full UI redesign

The frontend uses one central stylesheet:

```text
frontend/src/app-redesign.css
```

Old versioned theme override files are no longer loaded. Light and dark mode now use a single semantic token system, preventing dark text on dark surfaces and light text on light surfaces.

## Local setup

### 1. Create the database

```sql
CREATE DATABASE blogverse_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### 2. Backend environment

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

Update `DATABASE_URL`, `JWT_SECRET` and optional SMTP values.

### 3. Install and migrate backend

```bat
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name full_redesign_support_inbox_v18
npm run seed
npm run dev
```

### 4. Start frontend

```bat
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Backend health:

```text
http://localhost:5000/api/health
```

## Demo accounts

```text
Admin
Email: admin@blogverse.com
Password: Admin@123
```
Local demo credentials only — not valid in production
```text
Demo writers
ananya@blogverse.com
arjun@blogverse.com
maya@blogverse.com
Password: Writer@123
```

## Contact-to-admin workflow

1. A visitor or signed-in user submits the Contact form.
2. BlogVerse creates a unique ticket code and stores the message in MySQL.
3. Administrators open `Admin → Support`.
4. The administrator reads the message and writes a reply.
5. The reply is saved in MySQL.
6. Signed-in users can read replies on the Contact page.
7. When Brevo is configured, the reply is also sent to the supplied email address.

## Optional SMTP variables

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM="BlogVerse <your_email@gmail.com>"
```

## Verification

Run from the project root:

```bat
verify-v18-project.bat
```

This checks backend syntax, Prisma schema validation and the frontend production build.

## Production deployment

Recommended architecture:

- Source code: GitHub
- Frontend: Vercel
- Backend: Render
- Database: Aiven MySQL
- Permanent file storage: Cloudinary

For production migrations use:

```bat
npx prisma migrate deploy
```
