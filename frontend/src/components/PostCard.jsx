import { ArrowRight, ArrowUpRight, Check, Clock3, Copy, Heart, MessageCircle, Share2, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

function initials(name = "BlogVerse Creator") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "BC";
}

export default function PostCard({ post }) {
  const [copied, setCopied] = useState(false);
  const postUrl = `${window.location.origin}/post/${post.slug}`;

  async function copyPost(event) {
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* browser address bar remains available */ }
  }

  async function sharePost(event) {
    event.preventDefault();
    if (navigator.share) {
      try { await navigator.share({ title: post.title, text: post.excerpt, url: postUrl }); return; }
      catch (error) { if (error.name === "AbortError") return; }
    }
    await copyPost(event);
  }

  return (
    <article className="post-card interactive-surface">
      <Link to={`/post/${post.slug}`} className="post-image-wrap">
        <img className="post-image" src={post.coverImage || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80"} alt={post.title} />
        {post.category && <span className="category-pill">{post.category.name}</span>}
      </Link>
      <div className="post-card-body">
        <Link className="author-row author-link" to={`/profile/${post.author?.id}`}>
          <div className="avatar">{initials(post.author?.name)}</div>
          <div><strong>{post.author?.name || "BlogVerse Author"}</strong><span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span></div>
        </Link>
        <Link className="post-title-link" to={`/post/${post.slug}`}><h3>{post.title}</h3><ArrowUpRight size={20} /></Link>
        <p>{post.excerpt}</p>
        <div className="post-meta">
          <span><Clock3 size={16} /> {post.readTime || 1} min</span>
          <span><Heart size={16} /> {post._count?.likes || 0}</span>
          <span><MessageCircle size={16} /> {post._count?.comments || 0}</span>
        </div>
        <div className="post-card-share-row">
          <Link className="post-read-link" to={`/post/${post.slug}`}>Read story <ArrowRight size={16} /></Link>
          <div className="post-card-quick-actions">
            <Link to={`/communities?sharePost=${post.id}`} title="Share to community"><Users size={16} /><span>Community</span></Link>
            <button onClick={sharePost} title="Share"><Share2 size={16} /></button>
            <button onClick={copyPost} title="Copy URL">{copied ? <Check size={16} /> : <Copy size={16} />}</button>
          </div>
        </div>
      </div>
    </article>
  );
}
