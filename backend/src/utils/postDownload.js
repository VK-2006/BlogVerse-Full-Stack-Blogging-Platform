function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decodeBasicEntities(value = "") {
  return String(value)
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&#39;", "'");
}

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(String(value)).protocol);
  } catch {
    return false;
  }
}

export function storyHtmlToPlainText(value = "") {
  const text = String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|h4|h5|h6|blockquote|pre|ul|ol)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "");

  return decodeBasicEntities(text)
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function storyTextToHtml(value = "") {
  const plain = storyHtmlToPlainText(value);
  if (!plain) return "<p>This story does not contain body text.</p>";

  return plain
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("\n");
}

function safeLink(value) {
  return isHttpUrl(value) ? String(value) : "";
}

export function buildPostDownloadHtml(post) {
  const title = escapeHtml(post.title);
  const excerpt = escapeHtml(post.excerpt || "");
  const author = escapeHtml(post.author?.name || "BlogVerse Author");
  const category = escapeHtml(post.category?.name || "Uncategorised");
  const published = escapeHtml(
    new Date(post.publishedAt || post.createdAt || Date.now()).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  );
  const cover = safeLink(post.coverImage);
  const tags = (post.tags || []).map((item) => item.tag?.name).filter(Boolean);
  const links = (post.links || []).filter((item) => safeLink(item.url));
  const attachments = (post.attachments || []).filter((item) => safeLink(item.url));

  const tagHtml = tags.length
    ? `<div class="tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";

  const linkHtml = links.length
    ? `<section><h2>Related links</h2><ul>${links.map((link) => {
        const url = safeLink(link.url);
        return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label || url)}</a></li>`;
      }).join("")}</ul></section>`
    : "";

  const attachmentHtml = attachments.length
    ? `<section><h2>Shared files</h2><ul>${attachments.map((file) => {
        const url = safeLink(file.url);
        return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(file.originalName || "Attachment")}</a></li>`;
      }).join("")}</ul></section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — BlogVerse</title>
<style>
  :root { color-scheme: light; --ink:#101828; --muted:#667085; --line:#e4e7ec; --brand:#6d4aff; --soft:#f6f3ff; }
  * { box-sizing:border-box; }
  body { margin:0; background:#f7f8fc; color:var(--ink); font:16px/1.75 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  article { width:min(820px,calc(100% - 32px)); margin:40px auto; background:#fff; border:1px solid var(--line); border-radius:24px; overflow:hidden; box-shadow:0 24px 70px rgba(16,24,40,.10); }
  .hero { padding:42px 44px 30px; }
  .brand { color:var(--brand); font-weight:850; letter-spacing:.08em; text-transform:uppercase; font-size:12px; }
  h1 { margin:13px 0 12px; font-size:clamp(34px,7vw,58px); line-height:1.08; letter-spacing:-.04em; }
  .excerpt { color:#475467; font-size:19px; }
  .meta { display:flex; flex-wrap:wrap; gap:10px 18px; margin-top:24px; color:var(--muted); font-size:14px; }
  .cover { width:100%; max-height:520px; object-fit:cover; background:#eef0f5; }
  .content { padding:36px 44px 48px; }
  .content p { margin:0 0 22px; }
  h2 { margin:36px 0 12px; font-size:24px; }
  a { color:var(--brand); overflow-wrap:anywhere; }
  .tags { display:flex; flex-wrap:wrap; gap:8px; margin-top:22px; }
  .tags span { padding:7px 10px; border-radius:999px; background:var(--soft); color:#4c1d95; font-size:12px; font-weight:750; }
  .footer { padding:22px 44px; border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  @media(max-width:600px){ .hero,.content,.footer{padding-left:22px;padding-right:22px;} article{margin:16px auto;} }
</style>
</head>
<body>
<article>
  <header class="hero">
    <div class="brand">BlogVerse downloadable story</div>
    <h1>${title}</h1>
    <p class="excerpt">${excerpt}</p>
    <div class="meta"><span>By ${author}</span><span>${category}</span><span>${published}</span><span>${Number(post.readTime) || 1} min read</span></div>
    ${tagHtml}
  </header>
  ${cover ? `<img class="cover" src="${escapeHtml(cover)}" alt="${title}">` : ""}
  <main class="content">
    ${storyTextToHtml(post.content)}
    ${linkHtml}
    ${attachmentHtml}
  </main>
  <footer class="footer">Downloaded from BlogVerse. The author retains ownership of this story.</footer>
</article>
</body>
</html>`;
}
