import { AlertTriangle, Bookmark, Edit3, Eye, FileText, Heart, MessageCircle, Plus, Send, Trash2, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({
    stats: { posts: 0, drafts: 0, published: 0, blocked: 0, comments: 0, likes: 0 },
    recentPosts: [],
    draftPosts: []
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [publishingId, setPublishingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    api.get("/users/dashboard")
      .then(({ data: response }) => setData(response))
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function publishDraft(id) {
    setPublishingId(id);
    setError("");
    setMessage("");
    try {
      const { data: response } = await api.patch(`/posts/${id}/publish`);
      setMessage(response.message);
      load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPublishingId(null);
    }
  }

  async function deletePost() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      const { data: response } = await api.delete(`/posts/${deleteTarget.id}`);
      setMessage(response.message);
      setDeleteTarget(null);
      load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleting(false);
    }
  }

  const stats = [
    ["Total posts", data.stats.posts, FileText],
    ["Published", data.stats.published, Send],
    ["Drafts", data.stats.drafts, Bookmark],
    ["Blocked", data.stats.blocked || 0, AlertTriangle],
    ["Comments", data.stats.comments, MessageCircle],
    ["Total likes", data.stats.likes, Heart]
  ];

  return (
    <main className="page dashboard-page gradient-page">
      <section className="dashboard-hero">
        <div className="container dashboard-hero-inner">
          <div>
            <span className="overline">Creator dashboard</span>
            <h1>Welcome back, {user?.name?.split(" ")[0]}.</h1>
            <p>Edit drafts, publish stories, permanently delete posts and review your community reach.</p>
          </div>
          <div className="dashboard-hero-actions">
            <Link className="button button-ghost button-large" to={`/profile/${user?.id}`}><UserRound size={18} /> View profile</Link>
            <Link className="button button-primary button-large" to="/write"><Plus size={18} /> New story</Link>
          </div>
        </div>
      </section>

      <section className="section compact-top">
        <div className="container">
          {message && <div className="form-success dashboard-message">{message}</div>}
          {error && <div className="form-error dashboard-message">{error}</div>}

          <div className="stat-grid">
            {stats.map(([label, value, Icon]) => (
              <div className="stat-card interactive-surface" key={label}>
                <div className="stat-icon"><Icon /></div>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="dashboard-panel draft-workspace interactive-surface">
            <div className="section-heading compact">
              <div><span className="overline">Saved drafts</span><h2>Continue where you stopped</h2></div>
              <Link to="/write">New draft <Plus size={18} /></Link>
            </div>
            <div className="draft-grid">
              {data.draftPosts.map((draft) => (
                <article className="draft-card" key={draft.id}>
                  <div
                    className="draft-cover"
                    style={{
                      backgroundImage: `linear-gradient(135deg, rgba(16,24,40,.2), rgba(109,74,255,.38)), url(${draft.coverImage || "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=900&q=80"})`
                    }}
                  />
                  <div className="draft-card-body">
                    <span className="status draft">DRAFT</span>
                    <h3>{draft.title}</h3>
                    <p>{draft.excerpt || "This draft is waiting for your next idea."}</p>
                    <small>Updated {new Date(draft.updatedAt).toLocaleString()}</small>
                    <div className="draft-actions">
                      <Link className="button button-ghost" to={`/write/${draft.id}`}><Edit3 size={16} /> Edit</Link>
                      <button className="button button-primary" onClick={() => publishDraft(draft.id)} disabled={publishingId === draft.id}>
                        <Send size={16} /> {publishingId === draft.id ? "Publishing..." : "Publish now"}
                      </button>
                      <button className="button icon-danger-button" onClick={() => setDeleteTarget(draft)} title="Delete draft">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!data.draftPosts.length && (
                <div className="empty-state wide">
                  <h3>No saved drafts</h3>
                  <p>Save a story as draft and continue editing it anytime.</p>
                  <Link className="button button-primary" to="/write">Start a draft</Link>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-panel interactive-surface">
            <div className="section-heading compact">
              <div><span className="overline">Recent work</span><h2>Your latest stories</h2></div>
              <Link to="/communities">Visit community</Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Title</th><th>Status</th><th>Views</th><th>Engagement</th><th>Actions</th></tr></thead>
                <tbody>
                  {data.recentPosts.map((post) => (
                    <tr key={post.id}>
                      <td>
                        <Link to={post.status === "DRAFT" ? `/write/${post.id}` : `/post/${post.slug}`}>{post.title}</Link>
                        {post.isBlocked && <span className="creator-block-note"><AlertTriangle size={13} /> {post.blockedReason || "Blocked by admin"}</span>}
                      </td>
                      <td>
                        <span className={`status ${post.status.toLowerCase()}`}>{post.status}</span>
                        {post.isBlocked && <span className="status blocked">BLOCKED</span>}
                      </td>
                      <td><Eye size={15} /> {post.viewCount}</td>
                      <td>{post._count.likes} likes · {post._count.comments} comments</td>
                      <td className="table-actions">
                        <Link to={`/write/${post.id}`}><Edit3 size={16} /> Edit</Link>
                        {post.status === "DRAFT" && !post.isBlocked && <button onClick={() => publishDraft(post.id)}><Send size={16} /> Publish</button>}
                        <button className="table-delete-action" onClick={() => setDeleteTarget(post)}><Trash2 size={16} /> Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.recentPosts.length && <div className="empty-state"><h3>No stories yet</h3><p>Create your first draft or publish a new article.</p></div>}
            </div>
          </div>
        </div>
      </section>

      {deleteTarget && (
        <div className="prompt-backdrop">
          <section className="app-prompt prompt-warning" role="dialog" aria-modal="true">
            <button className="prompt-close" onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            <div className="prompt-icon"><AlertTriangle size={28} /></div>
            <span className="overline">Permanent deletion</span>
            <h2>Delete this post?</h2>
            <p><strong>{deleteTarget.title}</strong> will be removed from MySQL along with comments, likes, bookmarks, tags, attachments and related records. This cannot be undone.</p>
            <div className="prompt-actions">
              <button className="button button-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="button button-danger" onClick={deletePost} disabled={deleting}>
                <Trash2 size={17} /> {deleting ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
