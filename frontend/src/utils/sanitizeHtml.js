const ALLOWED_TAGS = new Set([
  "P", "BR", "H2", "H3", "H4", "STRONG", "EM", "B", "I",
  "UL", "OL", "LI", "BLOCKQUOTE", "A", "CODE", "PRE"
]);

function isSafeHttpUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function sanitizeStoryHtml(value = "") {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="blogverse-sanitize-root">${String(value)}</div>`, "text/html");
  const root = doc.getElementById("blogverse-sanitize-root");
  if (!root) return "";

  [...root.querySelectorAll("*")].forEach((node) => {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }

    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const allowed = node.tagName === "A" && ["href", "title", "target", "rel"].includes(name);
      if (!allowed) node.removeAttribute(attribute.name);
    });

    if (node.tagName === "A") {
      const href = node.getAttribute("href");
      if (!href || !isSafeHttpUrl(href)) {
        node.removeAttribute("href");
      } else {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
  });

  return root.innerHTML;
}
