# BlogVerse V13 Runtime Test Checklist

After applying the migration and starting both servers, verify in this order.

## Basic health

1. Open `http://localhost:5000/api/health` and confirm `success: true`.
2. Open `http://localhost:5173` and confirm Home loads without a white screen.
3. Sign in as an administrator.
4. Open `http://localhost:5173/admin`.

## Account controls

1. Search a normal user.
2. Disable the account with a reason.
3. In another browser/profile, confirm that user is signed out and cannot log in.
4. Enable the account.
5. Confirm the user can sign in again.
6. Confirm the current administrator cannot disable their own active account.

## Post moderation

1. Open the Post Moderation tab.
2. Search by post title, author name and author email.
3. Filter Published, Draft and Blocked posts.
4. Block a published post with a reason.
5. Confirm the post remains listed in the admin panel as Blocked.
6. Confirm it disappears from Home, Explore, author profile, community shared stories and bookmarks.
7. Confirm its public direct URL returns unavailable for a normal visitor.
8. Confirm the creator sees the block reason in Dashboard and Edit Post.
9. Confirm the creator cannot publish/update it as Published while blocked.
10. Unblock it and confirm it becomes public again.

## Responsive UI

Test widths: 1440px, 1024px, 768px, 480px and 360px.

- Hero, overview cards and tabs do not overflow.
- Search controls wrap correctly.
- Account cards become one column.
- Post cards become two columns and then one column.
- Confirmation modal remains usable.
- Dark mode text and controls remain visible.
