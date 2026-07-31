# BlogVerse V18 Full Redesign

## Why the previous UI failed

Multiple versioned CSS files were loaded together. Each file changed the same headings, surfaces and theme variables, causing dark text on dark backgrounds and low-contrast text in light mode.

## What changed

- Replaced the versioned CSS stack with one clean `app-redesign.css` file.
- Added semantic light/dark tokens.
- Added explicit text colours for always-dark brand heroes.
- Redesigned navigation, cards, forms, editor, article pages, profile, communities, dashboard and admin pages.
- Added responsive layouts for 1180px, 960px, 720px and 480px.
- Added support tickets and administrator replies.
- Added user-visible support history for authenticated users.

## Database migration

```bat
cd backend
npx prisma generate
npx prisma migrate dev --name full_redesign_support_inbox_v18
```

## Important

This is a complete project replacement, not a patch. Keep a backup of your current `backend/.env` before replacing the old project folder.
