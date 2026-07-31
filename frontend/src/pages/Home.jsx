import {
  ArrowRight,
  BookOpenCheck,
  Bookmark,
  Compass,
  Flame,
  Heart,
  MessageCircle,
  PenLine,
  Quote,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";
import api from "../services/api";

const fallbackTopics = ["Artificial Intelligence", "Web Development", "Career Growth", "Design Thinking", "Productivity", "Entrepreneurship"];

const starterIdeas = [
  {
    icon: PenLine,
    title: "Write your first story",
    text: "Turn your experience, lesson or idea into an article readers can use.",
    action: "Start writing",
    to: "/write"
  },
  {
    icon: Compass,
    title: "Discover something new",
    text: "Browse practical tutorials, personal stories and thoughtful perspectives.",
    action: "Explore stories",
    to: "/explore"
  },
  {
    icon: Users,
    title: "Join the community",
    text: "Ask questions, exchange feedback and help useful ideas travel further.",
    action: "Open communities",
    to: "/communities"
  }
];

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [communityItems, setCommunityItems] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/posts?limit=9"),
      api.get("/posts/meta/categories"),
      api.get("/community?limit=3")
    ]).then(([postResponse, categoryResponse, communityResponse]) => {
      setPosts(postResponse.data.posts || []);
      setCategories(categoryResponse.data.categories || []);
      setCommunityItems(communityResponse.data.items || []);
    }).catch(() => {});
  }, []);

  const featured = posts[0];
  const latestPosts = featured ? posts.slice(1, 7) : posts.slice(0, 6);
  const totalLikes = useMemo(() => posts.reduce((sum, post) => sum + (post._count?.likes || 0), 0), [posts]);
  const totalComments = useMemo(() => posts.reduce((sum, post) => sum + (post._count?.comments || 0), 0), [posts]);
  const topics = categories.length ? categories.map((item) => item.name) : fallbackTopics;

  return (
    <main className="home-page gradient-page">
      <section className="hero home-hero-v5">
        <div className="hero-glow glow-one" />
        <div className="hero-glow glow-two" />
        <div className="hero-grid-pattern" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={16} /> A home for curious minds</div>
            <h1>Ideas worth <span>sharing.</span> Stories worth remembering.</h1>
            <p>
              Publish what you know, discover fresh perspectives and build meaningful
              conversations with readers and writers from one creative community.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" to="/write">
                Start writing <PenLine size={18} />
              </Link>
              <Link className="button button-light button-large" to="/explore">
                Explore stories <ArrowRight size={18} />
              </Link>
            </div>
            <div className="hero-stats home-live-stats">
              <div><strong>{posts.length || "10+"}</strong><span>Featured stories</span></div>
              <div><strong>{totalLikes || "25+"}</strong><span>Reader reactions</span></div>
              <div><strong>{totalComments || "15+"}</strong><span>Conversations</span></div>
            </div>
          </div>

          <div className="hero-feature-card v5-feature-card">
            <div className="feature-card-badge"><Flame size={15} /> Trending now</div>
            <img
              src={featured?.coverImage || "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80"}
              alt={featured?.title || "Writing desk"}
            />
            <div className="hero-feature-content">
              <span className="category-pill static">{featured?.category?.name || "Editor's choice"}</span>
              <h2>{featured?.title || "Build a writing habit that changes your life"}</h2>
              <p>{featured?.excerpt || "Simple systems, thoughtful reflection and a community that keeps you inspired."}</p>
              <div className="featured-card-footer">
                <div className="featured-author">
                  <div className="avatar">{featured?.author?.name?.[0] || "B"}</div>
                  <div><strong>{featured?.author?.name || "Venkat Kiran"}</strong><span>{featured?.readTime || 5} min read</span></div>
                </div>
                <Link className="round-arrow-link" to={featured ? `/post/${featured.slug}` : "/explore"} aria-label="Read featured story"><ArrowRight /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="topic-marquee" aria-label="Popular topics">
        <div className="topic-marquee-track">
          {[...topics, ...topics].map((topic, index) => (
            <Link key={`${topic}-${index}`} to={`/explore?search=${encodeURIComponent(topic)}`}>
              <Sparkles size={13} /> {topic}
            </Link>
          ))}
        </div>
      </section>

      <section className="section feature-strip v5-feature-strip">
        <div className="container feature-grid">
          <div className="interactive-surface"><BookOpenCheck /><h3>Beautiful publishing</h3><p>Draft, edit and publish rich, readable stories.</p></div>
          <div className="interactive-surface"><Users /><h3>Real community</h3><p>Connect through thoughtful discussions and replies.</p></div>
          <div className="interactive-surface"><TrendingUp /><h3>Smart discovery</h3><p>Find useful ideas through search, topics and creators.</p></div>
        </div>
      </section>

      <section className="section home-editorial-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="overline">Latest stories</span>
              <h2>Fresh ideas from the community</h2>
              <p className="section-description">Practical lessons, original thinking and stories worth discussing.</p>
            </div>
            <Link to="/explore">View all stories <ArrowRight size={18} /></Link>
          </div>

          <div className="post-grid">
            {latestPosts.length ? latestPosts.map((post) => <PostCard key={post.id} post={post} />) : (
              <div className="empty-state wide richer-empty-state">
                <Sparkles />
                <h3>The publishing floor is ready</h3>
                <p>Run the demo seed or publish your first story to fill this space with articles.</p>
                <div><Link className="button button-primary" to="/write">Create post</Link><Link className="button button-ghost" to="/explore">Browse topics</Link></div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section categories-section v5-categories-section">
        <div className="container">
          <div className="section-heading">
            <div><span className="overline">Explore your interests</span><h2>Choose a topic. Find a new perspective.</h2></div>
            <span className="section-number">0{categories.length || 6} collections</span>
          </div>
          <div className="category-grid v5-category-grid">
            {(categories.length ? categories : fallbackTopics.map((name, id) => ({ id, name, slug: name.toLowerCase().replaceAll(" ", "-"), description: "Curated stories, ideas and practical lessons." }))).map((category, index) => (
              <Link key={category.id} to={`/explore?category=${category.slug}`} className={`category-card tone-${(index % 4) + 1} interactive-surface`}>
                <span>0{index + 1}</span>
                <div className="category-card-icon"><Compass /></div>
                <h3>{category.name}</h3>
                <p>{category.description || "Explore useful stories and perspectives from the community."}</p>
                <div className="category-card-link">Explore collection <ArrowRight /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-community-preview">
        <div className="container home-community-shell">
          <div className="community-preview-copy">
            <span className="overline">Community pulse</span>
            <h2>Great writing becomes better through conversation.</h2>
            <p>Share a question, recommend a story or help another creator improve an idea.</p>
            <Link className="button button-primary" to="/communities">Join the discussion <MessageCircle size={18} /></Link>
          </div>
          <div className="community-preview-list">
            {(communityItems.length ? communityItems : [
              { id: "a", content: "What is one small habit that improved the way you learn?", author: { name: "Ananya Sharma" }, _count: { replies: 8 } },
              { id: "b", content: "Share one project lesson that would help a beginner.", author: { name: "Arjun Rao" }, _count: { replies: 5 } },
              { id: "c", content: "Which technology are you excited to explore this month?", author: { name: "Maya Patel" }, _count: { replies: 11 } }
            ]).map((item) => (
              <Link to="/communities" className="community-preview-card interactive-surface" key={item.id}>
                <div className="avatar">{item.author.name[0]}</div>
                <div><strong>{item.author.name}</strong><p>{item.content}</p><span><MessageCircle size={14} /> {item._count?.replies || 0} replies</span></div>
                <ArrowRight />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-starter-section">
        <div className="container">
          <div className="section-heading centered-heading">
            <div><span className="overline">Make BlogVerse yours</span><h2>Read, create and connect your way.</h2></div>
          </div>
          <div className="starter-grid">
            {starterIdeas.map(({ icon: Icon, title, text, action, to }, index) => (
              <Link className="starter-card interactive-surface" to={to} key={title}>
                <span className="starter-index">0{index + 1}</span>
                <div className="starter-icon"><Icon /></div>
                <h3>{title}</h3><p>{text}</p><strong>{action} <ArrowRight size={17} /></strong>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section quote-section">
        <div className="container quote-card interactive-surface">
          <Quote />
          <blockquote>“The most useful story is often the one only you can tell.”</blockquote>
          <p>Write clearly. Share generously. Keep learning in public.</p>
          <div className="quote-actions">
            <Link className="button button-light button-large" to="/write"><PenLine size={18} /> Write a story</Link>
            <Link className="button button-glass button-large" to="/register"><Bookmark size={18} /> Create account</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
