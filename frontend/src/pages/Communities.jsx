import {
  Check,
  Copy,
  Edit3,
  Flame,
  Hash,
  Heart,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  PenLine,
  RefreshCw,
  Search,
  Send,
  Share2,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const rooms = [
  { value: "INTRODUCTIONS", name: "Introduce Yourself", description: "Meet writers and readers joining BlogVerse.", icon: Users },
  { value: "WRITING", name: "Writing Feedback", description: "Share drafts, headlines and storytelling questions.", icon: PenLine },
  { value: "TECHNOLOGY", name: "Technology Talk", description: "Discuss tools, AI, projects and engineering lessons.", icon: Hash },
  { value: "CAREER", name: "Career & Learning", description: "Exchange study systems, interview tips and career ideas.", icon: TrendingUp }
];

const topicLabels = {
  GENERAL: "General",
  INTRODUCTIONS: "Introductions",
  WRITING: "Writing",
  TECHNOLOGY: "Technology",
  CAREER: "Career & Learning"
};

const prompts = [
  "What is one lesson your latest project taught you?",
  "Which skill are you actively learning this month?",
  "Share a blog post that changed how you think."
];

function safeCount(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function Communities() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [content, setContent] = useState("");
  const [composerTopic, setComposerTopic] = useState("GENERAL");
  const [sharedPostId, setSharedPostId] = useState(searchParams.get("sharePost") || "");
  const [replyText, setReplyText] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [feedType, setFeedType] = useState("all");
  const [topicFilter, setTopicFilter] = useState("ALL");
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ members: 0, conversations: 0, replies: 0, likes: 0, stories: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, hasMore: false, total: 0 });
  const [expandedReplies, setExpandedReplies] = useState(() => new Set());
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingPostText, setEditingPostText] = useState("");
  const [editingPostTopic, setEditingPostTopic] = useState("GENERAL");
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState("");

  const load = useCallback(async ({ pageNumber = 1, append = false } = {}) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(pageNumber),
        limit: "8",
        type: feedType,
        sort
      });
      if (topicFilter !== "ALL") query.set("topic", topicFilter);
      if (search.trim()) query.set("search", search.trim());

      const { data } = await api.get(`/community?${query.toString()}`);
      setItems((current) => {
        if (!append) return data.items || [];
        const map = new Map(current.map((item) => [item.id, item]));
        for (const item of data.items || []) map.set(item.id, item);
        return [...map.values()];
      });
      setStats(data.stats || { members: 0, conversations: 0, replies: 0, likes: 0, stories: 0 });
      setPagination(data.pagination || { page: pageNumber, pages: 1, hasMore: false, total: 0 });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [feedType, search, sort, topicFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => load({ pageNumber: 1 }), 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!user) {
      setMyPosts([]);
      return;
    }
    api.get("/posts?mine=true&status=PUBLISHED&limit=20")
      .then(({ data }) => setMyPosts(data.posts || []))
      .catch(() => setMyPosts([]));
  }, [user]);

  useEffect(() => {
    if (sharedPostId) {
      window.setTimeout(() => document.getElementById("community-composer")?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [sharedPostId]);

  const selectedSharedPost = useMemo(
    () => myPosts.find((post) => String(post.id) === String(sharedPostId)),
    [myPosts, sharedPostId]
  );

  function startRoom(room) {
    setComposerTopic(room.value);
    setContent((current) => current || `${room.name}: `);
    document.getElementById("community-composer")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function createCommunityPost(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const { data } = await api.post("/community", {
        content,
        topic: composerTopic,
        sharedPostId: sharedPostId ? Number(sharedPostId) : null
      });
      setItems((current) => [data.item, ...current.filter((item) => item.id !== data.item.id)]);
      setContent("");
      setSharedPostId("");
      setComposerTopic("GENERAL");
      setMessage(data.message);
      setStats((current) => ({
        ...current,
        conversations: current.conversations + 1,
        stories: current.stories + (data.item.sharedPost ? 1 : 0)
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(itemId) {
    if (!user) {
      setError("Please sign in to like community posts.");
      return;
    }
    setError("");
    try {
      const { data } = await api.post(`/community/${itemId}/like`);
      setItems((current) => current.map((item) => item.id === itemId
        ? {
            ...item,
            likedByMe: data.liked,
            _count: { ...item._count, likes: data.count }
          }
        : item));
      setStats((current) => ({ ...current, likes: Math.max(0, current.likes + (data.liked ? 1 : -1)) }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function reply(itemId) {
    const value = (replyText[itemId] || "").trim();
    if (!value) return;
    setError("");
    try {
      const { data } = await api.post(`/community/${itemId}/replies`, { content: value });
      setItems((current) => current.map((item) => item.id === itemId
        ? {
            ...item,
            replies: [...(item.replies || []), data.reply],
            _count: { ...item._count, replies: safeCount(item._count?.replies) + 1 }
          }
        : item));
      setReplyText((current) => ({ ...current, [itemId]: "" }));
      setStats((current) => ({ ...current, replies: current.replies + 1 }));
      setExpandedReplies((current) => new Set(current).add(itemId));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function beginPostEdit(item) {
    setEditingPostId(item.id);
    setEditingPostText(item.content || "");
    setEditingPostTopic(item.topic || "GENERAL");
  }

  async function savePostEdit(itemId) {
    if (!editingPostText.trim()) return;
    setError("");
    try {
      const { data } = await api.put(`/community/${itemId}`, {
        content: editingPostText,
        topic: editingPostTopic
      });
      setItems((current) => current.map((item) => item.id === itemId ? data.item : item));
      setEditingPostId(null);
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeItem(id) {
    if (!window.confirm("Delete this community post and all replies?")) return;
    setError("");
    try {
      const target = items.find((item) => item.id === id);
      await api.delete(`/community/${id}`);
      setItems((current) => current.filter((item) => item.id !== id));
      setStats((current) => ({
        ...current,
        conversations: Math.max(0, current.conversations - 1),
        stories: Math.max(0, current.stories - (target?.sharedPost ? 1 : 0)),
        replies: Math.max(0, current.replies - safeCount(target?._count?.replies)),
        likes: Math.max(0, current.likes - safeCount(target?._count?.likes))
      }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function beginReplyEdit(replyItem) {
    setEditingReplyId(replyItem.id);
    setEditingReplyText(replyItem.content);
  }

  async function saveReplyEdit(itemId, replyId) {
    if (!editingReplyText.trim()) return;
    setError("");
    try {
      const { data } = await api.put(`/community/replies/${replyId}`, { content: editingReplyText });
      setItems((current) => current.map((item) => item.id === itemId
        ? { ...item, replies: item.replies.map((replyItem) => replyItem.id === replyId ? data.reply : replyItem) }
        : item));
      setEditingReplyId(null);
      setEditingReplyText("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeReply(itemId, replyId) {
    if (!window.confirm("Delete this reply?")) return;
    setError("");
    try {
      await api.delete(`/community/replies/${replyId}`);
      setItems((current) => current.map((item) => item.id === itemId
        ? {
            ...item,
            replies: item.replies.filter((replyItem) => replyItem.id !== replyId),
            _count: { ...item._count, replies: Math.max(0, safeCount(item._count?.replies) - 1) }
          }
        : item));
      setStats((current) => ({ ...current, replies: Math.max(0, current.replies - 1) }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function shareItem(item) {
    const url = item.sharedPost
      ? `${window.location.origin}/post/${item.sharedPost.slug}`
      : `${window.location.origin}/communities#community-${item.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.sharedPost?.title || "BlogVerse Community",
          text: item.content,
          url
        });
        return;
      } catch (shareError) {
        if (shareError.name === "AbortError") return;
      }
    }
    await copyText(url);
    setCopiedId(item.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  }

  function toggleReplies(itemId) {
    setExpandedReplies((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  return (
    <main className="page communities-page gradient-page">
      <section className="community-hero community-hero-v6">
        <div className="community-orb orb-a" />
        <div className="community-orb orb-b" />
        <div className="container community-hero-grid">
          <div>
            <span className="eyebrow"><Users size={16} /> BlogVerse Communities</span>
            <h1>Talk, share and grow <span>together.</span></h1>
            <p>A focused community for discussing ideas, sharing published stories, asking questions and learning from other creators.</p>
            <div className="community-hero-actions">
              <a className="button button-light" href={user ? "#community-composer" : "#community-feed"}>Start a conversation <Send size={17} /></a>
              <a className="button button-glass" href="#community-feed">Browse discussions <MessageCircle size={17} /></a>
            </div>
          </div>

          <div className="community-pulse-card">
            <div className="pulse-card-heading"><Flame /><div><strong>Community pulse</strong><span>Live activity across BlogVerse</span></div></div>
            <div className="pulse-stat-grid">
              <div><strong>{stats.members}</strong><span>Active voices</span></div>
              <div><strong>{stats.conversations}</strong><span>Conversations</span></div>
              <div><strong>{stats.replies}</strong><span>Replies</span></div>
              <div><strong>{stats.likes}</strong><span>Appreciations</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="community-room-section">
        <div className="container">
          <div className="section-heading compact"><div><span className="overline">Conversation rooms</span><h2>Choose a room and join the right discussion.</h2></div></div>
          <div className="community-room-grid">
            {rooms.map((room, index) => {
              const Icon = room.icon;
              return (
                <button type="button" className={`community-room-card room-tone-${index + 1} interactive-surface ${topicFilter === room.value ? "selected" : ""}`} key={room.value} onClick={() => startRoom(room)}>
                  <div><Icon /></div><span>{String(index + 1).padStart(2, "0")}</span><h3>{room.name}</h3><p>{room.description}</p><strong>Start here <MessageCircle /></strong>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section community-section">
        <div className="container community-layout community-layout-v6">
          <aside className="community-sidebar">
            <div className="community-guide interactive-surface"><Users /><h3>Community guide</h3><p>Ask clearly, reply helpfully and keep feedback respectful.</p><div><span>Public discussions</span><span>Story sharing</span><span>Likes & replies</span><span>Author profiles</span></div></div>
            <div className="prompt-panel interactive-surface"><Lightbulb /><h3>Conversation starters</h3>{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => { setContent(prompt); document.getElementById("community-composer")?.scrollIntoView({ behavior: "smooth" }); }}>{prompt}<Copy /></button>)}</div>
            <div className="community-trending-panel interactive-surface"><Flame /><h3>Popular this week</h3><button type="button" onClick={() => setSearch("fullstack")}>#fullstack</button><button type="button" onClick={() => setSearch("career")}>#career-growth</button><button type="button" onClick={() => setSearch("AI")}>#artificial-intelligence</button><button type="button" onClick={() => setSearch("writing")}>#writing-tips</button></div>
          </aside>

          <div className="community-main">
            {user ? (
              <form id="community-composer" className="community-composer community-composer-v6 interactive-surface" onSubmit={createCommunityPost}>
                <div className="composer-user"><div className="avatar large">{user.name?.[0] || "U"}</div><div><strong>{user.name}</strong><span>Share something useful with everyone</span></div></div>
                <div className="composer-topic-row">
                  <label>Room<select value={composerTopic} onChange={(event) => setComposerTopic(event.target.value)}>{Object.entries(topicLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <span>{content.length}/1200</span>
                </div>
                <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={1200} placeholder="Ask a question, share a lesson or start a thoughtful discussion..." />
                <div className="composer-prompt-chips">{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => setContent(prompt)}><Sparkles /> {prompt}</button>)}</div>
                <div className="composer-controls">
                  <select value={sharedPostId} onChange={(event) => setSharedPostId(event.target.value)}><option value="">Attach a published story (optional)</option>{myPosts.map((post) => <option key={post.id} value={post.id}>{post.title}</option>)}</select>
                  <button className="button button-primary" disabled={busy}><Send size={17} /> {busy ? "Sharing..." : "Share with community"}</button>
                </div>
                {selectedSharedPost && <div className="selected-community-story"><div><strong>{selectedSharedPost.title}</strong><span>Ready to share with your message</span></div><button type="button" onClick={() => setSharedPostId("")}><X size={17} /></button></div>}
              </form>
            ) : (
              <div className="community-login-card interactive-surface"><Users /><div><h3>Join the conversation</h3><p>Sign in to post, like, share stories and reply to other members.</p></div><Link className="button button-primary" to="/login">Sign in</Link></div>
            )}

            {message && <div className="form-success">{message}</div>}
            {error && <div className="form-error community-error"><span>{error}</span><button type="button" onClick={() => setError("")}><X size={16} /></button></div>}

            <div id="community-feed" className="community-feed-toolbar community-feed-toolbar-v6">
              <div><span className="overline">Live community feed</span><h2>What people are sharing</h2><p>{pagination.total} matching conversations</p></div>
              <div className="community-search-sort">
                <label className="community-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search discussions, people or stories" />{search && <button type="button" onClick={() => setSearch("")}><X size={15} /></button>}</label>
                <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="latest">Latest</option><option value="popular">Most popular</option></select>
              </div>
            </div>

            <div className="community-filter-bar">
              <div className="community-feed-tabs"><button type="button" className={feedType === "all" ? "active" : ""} onClick={() => setFeedType("all")}>All</button><button type="button" className={feedType === "discussions" ? "active" : ""} onClick={() => setFeedType("discussions")}>Discussions</button><button type="button" className={feedType === "stories" ? "active" : ""} onClick={() => setFeedType("stories")}>Shared stories</button></div>
              <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}><option value="ALL">All rooms</option>{Object.entries(topicLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            </div>

            <div className="community-feed">
              {loading ? Array.from({ length: 3 }).map((_, index) => <div className="community-skeleton" key={index}><div /><span /><span /><span /></div>) : items.map((item) => {
                const canManagePost = user && (user.id === item.author.id || user.role === "ADMIN");
                const showAllReplies = expandedReplies.has(item.id);
                const visibleReplies = showAllReplies ? item.replies : item.replies.slice(0, 3);
                return (
                  <article id={`community-${item.id}`} className="community-post community-post-v6 interactive-surface" key={item.id}>
                    <header>
                      <Link className="author-row author-link" to={`/profile/${item.author.id}`}><div className="avatar large">{item.author.name?.[0] || "U"}</div><div><strong>{item.author.name}</strong><span>{formatDate(item.createdAt)}{item.updatedAt !== item.createdAt ? " · edited" : ""}</span></div></Link>
                      <div className="community-post-tools"><button type="button" onClick={() => shareItem(item)} title="Share">{copiedId === item.id ? <Check size={17} /> : <Share2 size={17} />}</button>{canManagePost && <button type="button" onClick={() => beginPostEdit(item)} title="Edit"><Edit3 size={17} /></button>}{canManagePost && <button type="button" onClick={() => removeItem(item.id)} title="Delete"><Trash2 size={17} /></button>}</div>
                    </header>

                    <div className="community-topic-line"><span className={`community-topic topic-${String(item.topic || "GENERAL").toLowerCase()}`}>{topicLabels[item.topic] || "General"}</span>{item.sharedPost && <span>Shared story</span>}</div>

                    {editingPostId === item.id ? (
                      <div className="community-edit-box"><textarea maxLength={1200} value={editingPostText} onChange={(event) => setEditingPostText(event.target.value)} /><div><select value={editingPostTopic} onChange={(event) => setEditingPostTopic(event.target.value)}>{Object.entries(topicLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" className="button button-ghost" onClick={() => setEditingPostId(null)}>Cancel</button><button type="button" className="button button-primary" onClick={() => savePostEdit(item.id)}>Save changes</button></div></div>
                    ) : item.content && <p className="community-message">{item.content}</p>}

                    {item.sharedPost && <Link className="community-shared-post" to={`/post/${item.sharedPost.slug}`}><img src={item.sharedPost.coverImage || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=900&q=80"} alt={item.sharedPost.title} /><div><span>{item.sharedPost.category?.name || "Shared story"}</span><h3>{item.sharedPost.title}</h3><p>{item.sharedPost.excerpt}</p><small>By {item.sharedPost.author.name} · {item.sharedPost.readTime} min read</small></div></Link>}

                    <div className="community-action-row"><button type="button" className={item.likedByMe ? "active" : ""} onClick={() => toggleLike(item.id)}><Heart size={18} fill={item.likedByMe ? "currentColor" : "none"} /> {safeCount(item._count?.likes)} likes</button><button type="button" onClick={() => toggleReplies(item.id)}><MessageCircle size={18} /> {safeCount(item._count?.replies)} replies</button><button type="button" onClick={() => shareItem(item)}><Share2 size={18} /> Share</button></div>

                    <div className="community-replies">
                      {visibleReplies.map((replyItem) => {
                        const canManageReply = user && (user.id === replyItem.author.id || user.role === "ADMIN");
                        return (
                          <div className="community-reply" key={replyItem.id}>
                            <Link className="avatar" to={`/profile/${replyItem.author.id}`}>{replyItem.author.name?.[0] || "U"}</Link>
                            <div className="community-reply-content">
                              <div className="community-reply-header"><div><strong>{replyItem.author.name}</strong><span>{formatDate(replyItem.createdAt)}{replyItem.updatedAt !== replyItem.createdAt ? " · edited" : ""}</span></div>{canManageReply && <div><button type="button" onClick={() => beginReplyEdit(replyItem)}><Edit3 size={14} /></button><button type="button" onClick={() => removeReply(item.id, replyItem.id)}><Trash2 size={14} /></button></div>}</div>
                              {editingReplyId === replyItem.id ? <div className="reply-edit-box"><input value={editingReplyText} onChange={(event) => setEditingReplyText(event.target.value)} maxLength={600} /><button type="button" onClick={() => setEditingReplyId(null)}>Cancel</button><button type="button" onClick={() => saveReplyEdit(item.id, replyItem.id)}>Save</button></div> : <p>{replyItem.content}</p>}
                            </div>
                          </div>
                        );
                      })}

                      {item.replies.length > 3 && <button type="button" className="show-replies-button" onClick={() => toggleReplies(item.id)}>{showAllReplies ? "Show fewer replies" : `View ${item.replies.length - 3} more replies`}</button>}
                      {user && <div className="reply-box"><input value={replyText[item.id] || ""} maxLength={600} onChange={(event) => setReplyText((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Write a helpful reply..." onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); reply(item.id); } }} /><button type="button" onClick={() => reply(item.id)} disabled={!replyText[item.id]?.trim()}><Send size={17} /></button></div>}
                    </div>
                  </article>
                );
              })}

              {!loading && !items.length && <div className="empty-state community-rich-empty"><MessageCircle /><h3>No conversations match these filters</h3><p>Clear the search, select another room or start a new discussion.</p><div><button type="button" className="button button-ghost" onClick={() => { setSearch(""); setFeedType("all"); setTopicFilter("ALL"); }}>Clear filters</button>{user && <button type="button" className="button button-primary" onClick={() => { setContent(prompts[0]); document.getElementById("community-composer")?.scrollIntoView({ behavior: "smooth" }); }}>Start a conversation</button>}</div></div>}

              {pagination.hasMore && <button type="button" className="button button-ghost community-load-more" disabled={loadingMore} onClick={() => load({ pageNumber: pagination.page + 1, append: true })}>{loadingMore ? <><LoaderCircle className="spin" size={18} /> Loading...</> : "Load more conversations"}</button>}
              {!loading && error && <button type="button" className="button button-ghost community-retry" onClick={() => load({ pageNumber: 1 })}><RefreshCw size={17} /> Retry feed</button>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
