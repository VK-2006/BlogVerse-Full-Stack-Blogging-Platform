import api from "../services/api";

function fallbackName(post) {
  const slug = String(post?.slug || `blogverse-post-${post?.id || "story"}`)
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "blogverse-story"}.html`;
}

export async function downloadPostFile(post) {
  const response = await api.get(`/posts/${post.id}/download`, {
    responseType: "blob",
    timeout: 30000,
    skipRetry: true
  });

  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: "text/html;charset=utf-8" });

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fallbackName(post);
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
