# BlogVerse API Documentation

Base URL:

```text
http://localhost:5000/api
```

## Authentication

### Register

`POST /auth/register`

```json
{
  "name": "Rakesh",
  "email": "rakesh@example.com",
  "password": "Password@123"
}
```

### Login

`POST /auth/login`

```json
{
  "email": "rakesh@example.com",
  "password": "Password@123"
}
```

### Current User

`GET /auth/me`

Header:

```text
Authorization: Bearer TOKEN
```

## Posts

- `GET /posts`
- `GET /posts/:slug`
- `POST /posts`
- `PUT /posts/:id`
- `DELETE /posts/:id`
- `POST /posts/:id/like`
- `POST /posts/:id/bookmark`

## Comments

- `GET /comments/post/:postId`
- `POST /comments/post/:postId`
- `DELETE /comments/:id`

## Dashboard

- `GET /users/dashboard`
- `GET /users/bookmarks`


## Forgot Password

### Request Reset

`POST /auth/forgot-password`

```json
{ "email": "user@example.com" }
```

### Reset Password

`POST /auth/reset-password/:token`

```json
{ "password": "NewPassword123" }
```

## Contact

`POST /contact`

```json
{
  "name": "Rakesh",
  "email": "rakesh@example.com",
  "subject": "Project feedback",
  "message": "This is my message to the BlogVerse team."
}
```

## File Uploads

### Upload Post Attachments

`POST /uploads/post`

Authentication header:

```text
Authorization: Bearer TOKEN
```

Content type:

```text
multipart/form-data
```

Form field:

```text
files
```

Limits: 5 files per request, 10 MB per file.

## Post Resource Fields

Create and update post requests accept:

```json
{
  "attachments": [
    {
      "originalName": "project.pdf",
      "storedName": "generated-project.pdf",
      "url": "http://localhost:5000/uploads/posts/generated-project.pdf",
      "mimeType": "application/pdf",
      "size": 123456
    }
  ],
  "links": [
    {
      "label": "Official documentation",
      "url": "https://example.com"
    }
  ]
}
```

## V9 Account Lifecycle

### Heartbeat

`POST /auth/heartbeat` — authenticated browser presence update.

### Offline presence

`POST /auth/offline`

```json
{ "token": "SESSION_TOKEN" }
```

### Recover pending-deletion account

`POST /auth/recover-account`

```json
{ "recoveryToken": "SHORT_LIVED_RECOVERY_TOKEN" }
```

### Schedule account deletion

`POST /users/account/deletion-request`

```json
{
  "password": "CurrentPassword",
  "confirmation": "DELETE"
}
```

### Account status

`GET /users/account/status`

## V9 Admin Account Status

### List accounts

`GET /admin/users?search=&page=1&limit=20`

Admin role required. Returns account status and Active/Inactive browser presence.

### Disable or enable account

`PATCH /admin/users/:id/status`

```json
{
  "disabled": true,
  "reason": "Temporarily disabled for review."
}
```

## V10 Profile Details

### Update the authenticated user's profile

`PATCH /users/profile`

```json
{
  "name": "Venkat Kiran",
  "headline": "Founder building thoughtful digital communities",
  "occupation": "Full-Stack Developer & Creator",
  "location": "India",
  "website": "https://example.com",
  "socialLink": "https://www.linkedin.com/in/example",
  "avatar": "https://example.com/avatar.jpg",
  "bio": "Public creator biography"
}
```

All URL fields may be sent as an empty string to remove them.


## Admin Control Center (V13)

All endpoints require an authenticated `ADMIN` account.

- `GET /admin/overview` — accurate account and post moderation totals.
- `GET /admin/users?search=&status=&page=&limit=` — account activity and access status.
- `PATCH /admin/users/:id/status` — disable or enable an account.
- `GET /admin/posts?search=&status=&moderation=&page=&limit=` — list all posts for moderation.
- `PATCH /admin/posts/:id/status` — block or unblock a post.

Block a post:

```json
{
  "blocked": true,
  "reason": "Post requires changes before it can be public."
}
```

Unblock a post:

```json
{
  "blocked": false,
  "reason": ""
}
```

A blocked post remains in MySQL but is hidden from public feeds, profiles, communities, bookmarks, comments, likes, direct public links and future sharing. The author and administrators can still review it. Only an administrator can unblock it.

## V16 Per-User Post Review

All endpoints require an authenticated `ADMIN` account.

### View one user's posts

`GET /admin/users/:id/posts?search=&status=&moderation=&page=&limit=`

Supported `status` values:

- `ALL`
- `PUBLISHED`
- `DRAFT`
- `ARCHIVED`

Supported `moderation` values:

- `ALL`
- `VISIBLE`
- `BLOCKED`

The response includes the selected creator, filtered posts, per-creator totals, and pagination.

### Moderate a selected user's post

Use the existing endpoint:

`PATCH /admin/posts/:id/status`

```json
{
  "blocked": true,
  "reason": "This post requires changes before it can be public."
}
```

Administrators can open a user from the Accounts tab, review every post, preview it, and block or unblock it without deleting the post from MySQL.


## Support tickets

### Submit a contact request

`POST /api/contact`

```json
{
  "name": "Venkat Kiran",
  "email": "venkat@example.com",
  "subject": "Need help publishing a draft",
  "message": "The publish button is not working for my completed draft."
}
```

### Signed-in user's support history

`GET /api/contact/mine`

Requires a Bearer token.

### Admin support inbox

`GET /api/admin/contact-messages?status=NEW&page=1`

Requires an administrator Bearer token.

### Admin reply

`PATCH /api/admin/contact-messages/:id/reply`

```json
{
  "reply": "Please open the draft and complete the summary field before publishing.",
  "close": false
}
```

### Admin ticket status

`PATCH /api/admin/contact-messages/:id/status`

```json
{
  "status": "IN_PROGRESS"
}
```
