import { Bookmark, Download, ExternalLink, Eye, FileText, Heart, Link2, MessageCircle, ShieldAlert, Users, X } from "lucide-react";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function AdminPostDetailsModal({ post, loading, onClose, onDownload, downloading }) {
  if (!post) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card admin-post-details-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close post details"><X /></button>

        <div className="admin-post-details-head">
          <span className="modal-icon"><FileText /></span>
          <div>
            <span className="overline">Complete post details</span>
            <h2>{post.title}</h2>
            <p>{post.author?.name || "Unknown author"} · {post.author?.email || "No email"}</p>
          </div>
        </div>

        {loading ? (
          <div className="page-loader compact-loader">Loading post details...</div>
        ) : (
          <>
            <div className="admin-post-detail-chips">
              <span className={`status ${String(post.status || "draft").toLowerCase()}`}>{post.status}</span>
              <span className={`moderation-chip ${post.isBlocked ? "blocked" : "visible"}`}>{post.isBlocked ? "Blocked" : "Visible"}</span>
              <span className={`download-state-chip ${post.downloadEnabled ? "enabled" : "disabled"}`}>{post.downloadEnabled ? "Reader downloads on" : "Reader downloads off"}</span>
            </div>

            <div className="admin-post-detail-grid">
              <div><span>Category</span><strong>{post.category?.name || "Uncategorised"}</strong></div>
              <div><span>Read time</span><strong>{post.readTime || 1} min</strong></div>
              <div><span>Created</span><strong>{formatDate(post.createdAt)}</strong></div>
              <div><span>Updated</span><strong>{formatDate(post.updatedAt)}</strong></div>
              <div><span>Published</span><strong>{formatDate(post.publishedAt)}</strong></div>
              <div><span>Words</span><strong>{post.wordCount || 0}</strong></div>
            </div>

            <div className="admin-post-metric-grid">
              <div><Eye /><strong>{post.viewCount || 0}</strong><span>Views</span></div>
              <div><Heart /><strong>{post._count?.likes || 0}</strong><span>Likes</span></div>
              <div><MessageCircle /><strong>{post._count?.comments || 0}</strong><span>Comments</span></div>
              <div><Bookmark /><strong>{post._count?.bookmarks || 0}</strong><span>Bookmarks</span></div>
              <div><Users /><strong>{post._count?.communityShares || 0}</strong><span>Shares</span></div>
              <div><Download /><strong>{post.downloadCount || 0}</strong><span>Downloads</span></div>
            </div>

            {post.blockedReason && <div className="blocked-reason admin-detail-blocked"><ShieldAlert size={17} /> {post.blockedReason}</div>}

            <section className="admin-post-detail-section">
              <span className="overline">Summary</span>
              <p>{post.excerpt || "No summary."}</p>
            </section>

            <section className="admin-post-detail-section">
              <span className="overline">Story content</span>
              <p className="admin-story-preview">{post.contentText || "No story content."}</p>
            </section>

            {!!post.tags?.length && (
              <section className="admin-post-detail-section">
                <span className="overline">Tags</span>
                <div className="admin-tag-list">{post.tags.map((item) => <span key={item.tag?.id || item.tag?.name}>{item.tag?.name}</span>)}</div>
              </section>
            )}

            {!!post.attachments?.length && (
              <section className="admin-post-detail-section">
                <span className="overline">Attachments</span>
                <div className="admin-detail-link-list">
                  {post.attachments.map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.id}><FileText size={16} /><span>{file.originalName}<small>{formatBytes(file.size)} · {file.mimeType}</small></span><ExternalLink size={15} /></a>)}
                </div>
              </section>
            )}

            {!!post.links?.length && (
              <section className="admin-post-detail-section">
                <span className="overline">Related links</span>
                <div className="admin-detail-link-list">
                  {post.links.map((link) => <a href={link.url} target="_blank" rel="noreferrer" key={link.id}><Link2 size={16} /><span>{link.label || link.url}<small>{link.url}</small></span><ExternalLink size={15} /></a>)}
                </div>
              </section>
            )}

            <div className="modal-actions admin-post-detail-actions">
              <button className="button button-primary" onClick={() => onDownload(post)} disabled={downloading}><Download size={16} /> {downloading ? "Downloading..." : "Download story"}</button>
              <a className="button button-ghost" href={`/post/${post.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open story</a>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
