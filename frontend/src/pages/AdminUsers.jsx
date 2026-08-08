import {
  Activity,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Heart,
  Inbox,
  Mail,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  TicketCheck,
  UserCog,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminPostDetailsModal from "../components/AdminPostDetailsModal";
import SupportThread from "../components/SupportThread";
import api from "../services/api";
import { downloadPostFile } from "../utils/downloadPost";

const emptyOverview = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
  disabledUsers: 0,
  pendingDeletionUsers: 0,
  totalPosts: 0,
  publishedPosts: 0,
  draftPosts: 0,
  blockedPosts: 0,
  newContactMessages: 0,
  openContactMessages: 0
};

function initials(name = "User") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="admin-pagination">
      <button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}><ChevronLeft size={17} /> Previous</button>
      <span>Page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> · {pagination.total} results</span>
      <button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)}>Next <ChevronRight size={17} /></button>
    </div>
  );
}

export default function AdminUsers() {
  const [tab, setTab] = useState("users");
  const [overview, setOverview] = useState(emptyOverview);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [userSearch, setUserSearch] = useState("");
  const [userStatus, setUserStatus] = useState("ALL");
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [postSearch, setPostSearch] = useState("");
  const [postStatus, setPostStatus] = useState("ALL");
  const [postModeration, setPostModeration] = useState("ALL");
  const [postPage, setPostPage] = useState(1);
  const [postPagination, setPostPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [messageSearch, setMessageSearch] = useState("");
  const [messageStatus, setMessageStatus] = useState("ALL");
  const [messagePage, setMessagePage] = useState(1);
  const [messagePagination, setMessagePagination] = useState({ page: 1, pages: 1, total: 0 });

  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [closeAfterReply, setCloseAfterReply] = useState(false);
  const [busy, setBusy] = useState(false);

  const [creatorDrawer, setCreatorDrawer] = useState(null);
  const [creatorPosts, setCreatorPosts] = useState([]);
  const [creatorSummary, setCreatorSummary] = useState({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, blockedPosts: 0 });
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [postDetails, setPostDetails] = useState(null);
  const [postDetailsLoading, setPostDetailsLoading] = useState(false);
  const [downloadingPostId, setDownloadingPostId] = useState(null);

  const loadOverview = useCallback(async () => {
    const { data } = await api.get("/admin/overview");
    setOverview(data.stats);
  }, []);

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(userPage), limit: "18", status: userStatus });
    if (userSearch.trim()) params.set("search", userSearch.trim());
    const { data } = await api.get(`/admin/users?${params}`);
    setUsers(data.users || []);
    setUserPagination(data.pagination);
  }, [userPage, userSearch, userStatus]);

  const loadPosts = useCallback(async () => {
    const params = new URLSearchParams({ page: String(postPage), limit: "18", status: postStatus, moderation: postModeration });
    if (postSearch.trim()) params.set("search", postSearch.trim());
    const { data } = await api.get(`/admin/posts?${params}`);
    setPosts(data.posts || []);
    setPostPagination(data.pagination);
  }, [postPage, postSearch, postStatus, postModeration]);

  const loadMessages = useCallback(async () => {
    const params = new URLSearchParams({ page: String(messagePage), limit: "12", status: messageStatus });
    if (messageSearch.trim()) params.set("search", messageSearch.trim());
    const { data } = await api.get(`/admin/contact-messages?${params}`);
    setMessages(data.messages || []);
    setMessagePagination(data.pagination);
  }, [messagePage, messageSearch, messageStatus]);

  const loadTab = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadOverview();
      if (tab === "users") await loadUsers();
      if (tab === "posts") await loadPosts();
      if (tab === "messages") await loadMessages();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [tab, loadOverview, loadUsers, loadPosts, loadMessages]);

  useEffect(() => { loadTab(); }, [loadTab]);

  useEffect(() => {
    const locked = Boolean(action || replyTarget || creatorDrawer || postDetails);
    document.body.classList.toggle("modal-open", locked);
    return () => document.body.classList.remove("modal-open");
  }, [action, replyTarget, creatorDrawer, postDetails]);

  async function loadCreatorPosts(account) {
    setCreatorDrawer(account);
    setCreatorLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${account.id}/posts?limit=30`);
      setCreatorPosts(data.posts || []);
      setCreatorSummary(data.summary || creatorSummary);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCreatorLoading(false);
    }
  }

  async function loadPostDetails(post) {
    setPostDetails(post);
    setPostDetailsLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/admin/posts/${post.id}`);
      setPostDetails(data.post);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPostDetailsLoading(false);
    }
  }

  async function downloadPost(post) {
    if (!post || downloadingPostId) return;
    setDownloadingPostId(post.id);
    setError("");
    try {
      await downloadPostFile(post);
      setNotice(`“${post.title}” downloaded successfully.`);
      const increment = (item) => item.id === post.id ? { ...item, downloadCount: (item.downloadCount || 0) + 1 } : item;
      setPosts((current) => current.map(increment));
      setCreatorPosts((current) => current.map(increment));
      setPostDetails((current) => current?.id === post.id ? { ...current, downloadCount: (current.downloadCount || 0) + 1 } : current);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloadingPostId(null);
    }
  }

  async function confirmAction() {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      if (action.type === "user") {
        const { data } = await api.patch(`/admin/users/${action.item.id}/status`, {
          disabled: !action.item.isDisabled,
          reason: action.item.isDisabled ? "" : reason
        });
        setNotice(data.message);
        await Promise.all([loadUsers(), loadOverview()]);
      } else {
        const { data } = await api.patch(`/admin/posts/${action.item.id}/status`, {
          blocked: !action.item.isBlocked,
          reason: action.item.isBlocked ? "" : reason
        });
        setNotice(data.message);
        await Promise.all([loadPosts(), loadOverview()]);
        if (creatorDrawer) await loadCreatorPosts(creatorDrawer);
      }
      setAction(null);
      setReason("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!replyTarget || replyText.trim().length < 2) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.patch(`/admin/contact-messages/${replyTarget.id}/reply`, {
        reply: replyText.trim(),
        close: closeAfterReply
      });
      setNotice(data.message);
      setReplyTarget(null);
      setReplyText("");
      setCloseAfterReply(false);
      await Promise.all([loadMessages(), loadOverview()]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateMessageStatus(item, status) {
    try {
      const { data } = await api.patch(`/admin/contact-messages/${item.id}/status`, { status });
      setNotice(data.message);
      await Promise.all([loadMessages(), loadOverview()]);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const statCards = useMemo(() => [
    { label: "Total accounts", value: overview.totalUsers, icon: Users, tone: "purple" },
    { label: "Active now", value: overview.activeUsers, icon: Activity, tone: "green" },
    { label: "Published posts", value: overview.publishedPosts, icon: FileText, tone: "blue" },
    { label: "Open support", value: overview.openContactMessages, icon: Inbox, tone: "orange" }
  ], [overview]);

  return (
    <main className="page admin-page">
      <section className="admin-hero">
        <div className="container admin-hero-grid">
          <div>
            <span className="eyebrow"><ShieldCheck size={16} /> BlogVerse administration</span>
            <h1>One clean control centre for the whole platform.</h1>
            <p>Manage accounts, review stories, moderate blocked content and reply to support requests without losing user data.</p>
          </div>
          <div className="admin-hero-summary surface-card">
            <span>System overview</span>
            <strong>{overview.totalUsers + overview.totalPosts}</strong>
            <p>accounts and stories managed</p>
            <button className="button button-light full" onClick={loadTab}><RefreshCw size={17} /> Refresh data</button>
          </div>
        </div>
      </section>

      <section className="section admin-body">
        <div className="container">
          {notice && <div className="form-success admin-notice"><CheckCircle2 /> {notice}</div>}
          {error && <div className="form-error admin-notice">{error}</div>}

          <div className="admin-stat-grid">
            {statCards.map(({ label, value, icon: Icon, tone }) => (
              <article className={`admin-stat-card tone-${tone}`} key={label}><span><Icon /></span><div><strong>{value}</strong><small>{label}</small></div></article>
            ))}
          </div>

          <section className="admin-console surface-card">
            <div className="admin-tabs" role="tablist">
              <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><Users size={18} /> Accounts <span>{overview.totalUsers}</span></button>
              <button className={tab === "posts" ? "active" : ""} onClick={() => setTab("posts")}><FileText size={18} /> Posts <span>{overview.totalPosts}</span></button>
              <button className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")}><Inbox size={18} /> Support <span>{overview.newContactMessages}</span></button>
            </div>

            {tab === "users" && (
              <div className="admin-panel">
                <AdminToolbar title="Accounts and access" description="Search users, review activity and disable or restore access." value={userSearch} setValue={setUserSearch} onSearch={() => { setUserPage(1); loadUsers(); }}>
                  <select value={userStatus} onChange={(e) => { setUserStatus(e.target.value); setUserPage(1); }}>
                    <option value="ALL">All accounts</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="DISABLED">Disabled</option><option value="PENDING_DELETION">Pending deletion</option>
                  </select>
                </AdminToolbar>
                {loading ? <div className="page-loader compact-loader">Loading accounts...</div> : (
                  <div className="admin-user-grid">
                    {users.map((account) => (
                      <article className="admin-user-card" key={account.id}>
                        <div className="admin-card-head"><div className="admin-avatar">{account.avatar ? <img src={account.avatar} alt="" /> : initials(account.name)}<i className={account.presenceStatus === "ACTIVE" ? "online" : "offline"} /></div><div><h3>{account.name}</h3><p>{account.email}</p></div><span className="role-chip">{account.role}</span></div>
                        <div className="admin-status-line"><span className={`status-chip ${account.presenceStatus.toLowerCase()}`}>{account.presenceStatus}</span><span className={`status-chip ${account.accountStatus.toLowerCase()}`}>{account.accountStatus.replaceAll("_", " ")}</span></div>
                        <div className="admin-mini-stats"><div><strong>{account._count.posts}</strong><span>Posts</span></div><div><strong>{account._count.comments}</strong><span>Comments</span></div><div><strong>{account._count.communityPosts}</strong><span>Community</span></div></div>
                        <div className="admin-detail-lines"><p><span>Last seen</span><strong>{formatDate(account.lastSeenAt)}</strong></p><p><span>Last login</span><strong>{formatDate(account.lastLoginAt)}</strong></p>{account.disabledReason && <p><span>Reason</span><strong>{account.disabledReason}</strong></p>}</div>
                        <div className="admin-card-actions"><button className="button button-ghost" onClick={() => loadCreatorPosts(account)}><FileText size={16} /> View posts</button><button className={`button ${account.accountStatus === "DISABLED" ? "button-success" : "button-danger"}`} onClick={() => { setAction({ type: "user", item: { ...account, isDisabled: account.accountStatus === "DISABLED" } }); setReason(account.disabledReason || ""); }}><UserCog size={16} /> {account.accountStatus === "DISABLED" ? "Enable" : "Disable"}</button></div>
                      </article>
                    ))}
                  </div>
                )}
                <Pagination pagination={userPagination} onPage={setUserPage} />
              </div>
            )}

            {tab === "posts" && (
              <div className="admin-panel">
                <AdminToolbar title="Post moderation" description="Preview every story and block or restore public visibility." value={postSearch} setValue={setPostSearch} onSearch={() => { setPostPage(1); loadPosts(); }}>
                  <select value={postStatus} onChange={(e) => { setPostStatus(e.target.value); setPostPage(1); }}><option value="ALL">All statuses</option><option value="PUBLISHED">Published</option><option value="DRAFT">Drafts</option><option value="ARCHIVED">Archived</option></select>
                  <select value={postModeration} onChange={(e) => { setPostModeration(e.target.value); setPostPage(1); }}><option value="ALL">All moderation</option><option value="VISIBLE">Visible</option><option value="BLOCKED">Blocked</option></select>
                </AdminToolbar>
                {loading ? <div className="page-loader compact-loader">Loading posts...</div> : <PostModerationGrid posts={posts} onAction={(post) => { setAction({ type: "post", item: post }); setReason(post.blockedReason || ""); }} onDetails={loadPostDetails} onDownload={downloadPost} downloadingPostId={downloadingPostId} />}
                <Pagination pagination={postPagination} onPage={setPostPage} />
              </div>
            )}

            {tab === "messages" && (
              <div className="admin-panel">
                <AdminToolbar title="Support inbox" description="Read contact requests, reply to users and close resolved tickets." value={messageSearch} setValue={setMessageSearch} onSearch={() => { setMessagePage(1); loadMessages(); }}>
                  <select value={messageStatus} onChange={(e) => { setMessageStatus(e.target.value); setMessagePage(1); }}><option value="ALL">All tickets</option><option value="NEW">New</option><option value="IN_PROGRESS">In progress</option><option value="REPLIED">Replied</option><option value="CLOSED">Closed</option></select>
                </AdminToolbar>
                {loading ? <div className="page-loader compact-loader">Loading support messages...</div> : (
                  <div className="admin-message-list">
                    {messages.map((item) => (
                      <article className="admin-message-card" key={item.id}>
                        <div className="admin-message-head"><div><span className="ticket-code">{item.ticketCode || `BV-LEGACY-${item.id}`}</span><h3>{item.subject}</h3><p>{item.name} · {item.email}</p></div><span className={`support-status status-${item.status.toLowerCase()}`}>{item.status.replaceAll("_", " ")}</span></div>
                        <SupportThread ticket={item} audience="admin" compact />
                        <div className="support-time-row"><span>Received {formatDate(item.createdAt)}</span>{item.repliedAt && <span>Latest admin response {formatDate(item.repliedAt)}</span>}</div>
                        <div className="admin-card-actions"><button className="button button-primary" onClick={() => { setReplyTarget(item); setReplyText(""); setCloseAfterReply(item.status === "CLOSED"); }}><Send size={16} /> {item.threadEntries?.length || item.adminReply ? "Add response" : "Reply"}</button>{item.status === "NEW" && <button className="button button-ghost" onClick={() => updateMessageStatus(item, "IN_PROGRESS")}><Clock3 size={16} /> Mark in progress</button>}{item.status !== "CLOSED" && <button className="button button-ghost" onClick={() => updateMessageStatus(item, "CLOSED")}><CheckCircle2 size={16} /> Close</button>}</div>
                      </article>
                    ))}
                    {!messages.length && <div className="empty-state"><Inbox /><h3>No support messages</h3><p>No tickets match the selected filter.</p></div>}
                  </div>
                )}
                <Pagination pagination={messagePagination} onPage={setMessagePage} />
              </div>
            )}
          </section>
        </div>
      </section>

      {creatorDrawer && (
        <div className="drawer-backdrop" onClick={() => setCreatorDrawer(null)}>
          <aside className="admin-drawer" onClick={(event) => event.stopPropagation()}>
            <header><div><span className="overline">Creator post review</span><h2>{creatorDrawer.name}</h2><p>{creatorDrawer.email}</p></div><button className="icon-button" onClick={() => setCreatorDrawer(null)}><X /></button></header>
            <div className="admin-drawer-stats"><div><strong>{creatorSummary.totalPosts}</strong><span>Total</span></div><div><strong>{creatorSummary.publishedPosts}</strong><span>Published</span></div><div><strong>{creatorSummary.draftPosts}</strong><span>Drafts</span></div><div><strong>{creatorSummary.blockedPosts}</strong><span>Blocked</span></div></div>
            {creatorLoading ? <div className="page-loader compact-loader">Loading creator posts...</div> : <PostModerationGrid compact posts={creatorPosts} onAction={(post) => { setAction({ type: "post", item: { ...post, author: creatorDrawer } }); setReason(post.blockedReason || ""); }} onDetails={loadPostDetails} onDownload={downloadPost} downloadingPostId={downloadingPostId} />}
          </aside>
        </div>
      )}

      {action && (
        <div className="modal-backdrop">
          <section className="modal-card" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setAction(null)}><X /></button>
            <span className="modal-icon">{action.type === "user" ? <UserCog /> : <ShieldAlert />}</span>
            <span className="overline">Administrator confirmation</span>
            <h2>{action.item.isDisabled || action.item.isBlocked ? "Restore access?" : action.type === "user" ? "Disable account?" : "Block post?"}</h2>
            <p>{action.type === "user" ? `${action.item.name}'s account access will be updated.` : `“${action.item.title}” visibility will be updated without deleting the story.`}</p>
            {!action.item.isDisabled && !action.item.isBlocked && <label>Reason shown to the creator<textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why this action is required..." /></label>}
            <div className="modal-actions"><button className="button button-ghost" onClick={() => setAction(null)}>Cancel</button><button className={`button ${action.item.isDisabled || action.item.isBlocked ? "button-success" : "button-danger"}`} onClick={confirmAction} disabled={busy}>{busy ? "Updating..." : action.item.isDisabled || action.item.isBlocked ? "Restore" : "Confirm"}</button></div>
          </section>
        </div>
      )}

      {postDetails && <AdminPostDetailsModal post={postDetails} loading={postDetailsLoading} onClose={() => setPostDetails(null)} onDownload={downloadPost} downloading={downloadingPostId === postDetails.id} />}

      {replyTarget && (
        <div className="modal-backdrop">
          <section className="modal-card support-reply-modal" role="dialog" aria-modal="true">
            <button className="modal-close" onClick={() => setReplyTarget(null)}><X /></button>
            <span className="modal-icon"><Mail /></span>
            <span className="overline">Reply to {replyTarget.ticketCode || `BV-LEGACY-${replyTarget.id}`}</span>
            <h2>{replyTarget.subject}</h2>
            <SupportThread ticket={replyTarget} audience="admin" compact />
            <label>Administrator response<textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a clear and helpful response..." /></label>
            <label className="checkbox-row"><input type="checkbox" checked={closeAfterReply} onChange={(e) => setCloseAfterReply(e.target.checked)} /> Close this ticket after replying</label>
            <div className="modal-actions"><button className="button button-ghost" onClick={() => setReplyTarget(null)}>Cancel</button><button className="button button-primary" onClick={sendReply} disabled={busy || replyText.trim().length < 2}>{busy ? "Sending..." : "Send reply"} <Send size={16} /></button></div>
          </section>
        </div>
      )}
    </main>
  );
}

function AdminToolbar({ title, description, value, setValue, onSearch, children }) {
  return (
    <div className="admin-toolbar">
      <div><h2>{title}</h2><p>{description}</p></div>
      <div className="admin-toolbar-controls">
        <form onSubmit={(e) => { e.preventDefault(); onSearch(); }}><Search size={18} /><input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search..." /><button className="button button-primary">Search</button></form>
        {children}
      </div>
    </div>
  );
}

function PostModerationGrid({ posts, onAction, onDetails, onDownload, downloadingPostId, compact = false }) {
  if (!posts.length) return <div className="empty-state"><FileText /><h3>No posts found</h3><p>No stories match the current filters.</p></div>;
  return (
    <div className={compact ? "admin-drawer-posts" : "admin-post-grid"}>
      {posts.map((post) => (
        <article className={`admin-post-card ${post.isBlocked ? "is-blocked" : ""}`} key={post.id}>
          <img src={post.coverImage || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=700&q=75"} alt="" />
          <div><div className="admin-post-badges"><span className={`status ${post.status.toLowerCase()}`}>{post.status}</span><span className={`moderation-chip ${post.isBlocked ? "blocked" : "visible"}`}>{post.isBlocked ? "Blocked" : "Visible"}</span></div><h3>{post.title}</h3><p>{post.excerpt}</p>{post.author && <span className="post-author-line">{post.author.name} · {post.author.email}</span>}<div className="post-metrics"><span><Heart size={14} /> {post._count?.likes || 0}</span><span><MessageCircle size={14} /> {post._count?.comments || 0}</span><span>{post.viewCount || 0} views</span></div>{post.blockedReason && <div className="blocked-reason"><ShieldAlert size={15} /> {post.blockedReason}</div>}<div className="admin-card-actions"><button className="button button-ghost" onClick={() => onDetails(post)}><FileText size={15} /> Details</button><button className="button button-ghost" onClick={() => onDownload(post)} disabled={downloadingPostId === post.id}><Download size={15} /> {downloadingPostId === post.id ? "Downloading..." : "Download"}</button><Link className="button button-ghost" to={`/post/${post.slug}`} target="_blank"><ExternalLink size={15} /> Preview</Link><button className={`button ${post.isBlocked ? "button-success" : "button-danger"}`} onClick={() => onAction(post)}>{post.isBlocked ? <CheckCircle2 size={16} /> : <Ban size={16} />}{post.isBlocked ? "Unblock" : "Block"}</button></div></div>
        </article>
      ))}
    </div>
  );
}
