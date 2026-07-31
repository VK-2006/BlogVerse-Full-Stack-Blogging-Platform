import {
  ArrowRight,
  BookOpen,
  Clock3,
  Compass,
  Flame,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import api from "../services/api";

const discoveryTopics = ["AI", "React", "Node.js", "Career", "Design", "Productivity", "Startups", "Learning"];
const collections = [
  { title: "Build better software", description: "Practical engineering, AI and full-stack development stories.", query: "technology", icon: Compass },
  { title: "Grow your career", description: "Communication, learning systems and workplace lessons.", query: "career", icon: TrendingUp },
  { title: "Think more clearly", description: "Productivity, creativity and better decision-making.", query: "productivity", icon: Sparkles }
];

function initials(name = "BlogVerse Creator") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "BC";
}

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [creators, setCreators] = useState([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [sort, setSort] = useState("newest");
  const category = searchParams.get("category") || "";

  useEffect(() => {
    Promise.allSettled([
      api.get("/posts/meta/categories"),
      api.get("/users/creators")
    ]).then(([categoryResult, creatorResult]) => {
      if (categoryResult.status === "fulfilled") {
        setCategories(categoryResult.value.data.categories || []);
      }
      if (creatorResult.status === "fulfilled") {
        setCreators(creatorResult.value.data.creators || []);
      }
    });
  }, []);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    const query = new URLSearchParams();
    if (searchParams.get("search")) query.set("search", searchParams.get("search"));
    if (category) query.set("category", category);
    query.set("limit", "20");

    api.get(`/posts?${query.toString()}`)
      .then(({ data }) => setPosts(data.posts || []))
      .catch(() => setPosts([]));
  }, [searchParams, category]);

  const sortedPosts = useMemo(() => {
    const copy = [...posts];
    if (sort === "popular") {
      return copy.sort((a, b) => ((b._count?.likes || 0) + b.viewCount) - ((a._count?.likes || 0) + a.viewCount));
    }
    if (sort === "quick") return copy.sort((a, b) => a.readTime - b.readTime);
    return copy.sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
  }, [posts, sort]);

  const featured = sortedPosts[0];
  const gridPosts = featured ? sortedPosts.slice(1) : sortedPosts;

  function submit(event) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (search.trim()) next.set("search", search.trim());
    else next.delete("search");
    setSearchParams(next);
  }

  function selectCategory(slug) {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set("category", slug);
    else next.delete("category");
    setSearchParams(next);
  }

  function selectTopic(topic) {
    setSearch(topic);
    const next = new URLSearchParams(searchParams);
    next.set("search", topic);
    next.delete("category");
    setSearchParams(next);
  }

  return (
    <main className="page explore-page-v5 gradient-page">
      <section className="explore-header explore-header-v5">
        <div className="explore-orb explore-orb-one" />
        <div className="explore-orb explore-orb-two" />
        <div className="container">
          <span className="eyebrow"><Compass size={16} /> Discover your next idea</span>
          <h1>Explore stories that help you <span>learn and grow.</span></h1>
          <p>Search articles, browse focused collections and meet writers sharing practical knowledge.</p>

          <form className="search-box explore-search-box" onSubmit={submit}>
            <Search size={20} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, technology, skill or idea..." />
            <button className="button button-primary">Search stories</button>
          </form>

          <div className="trending-topic-row">
            <span><Flame size={15} /> Trending:</span>
            {discoveryTopics.map((topic) => <button key={topic} onClick={() => selectTopic(topic)}>{topic}</button>)}
          </div>
        </div>
      </section>

      <section className="explore-collections-section">
        <div className="container explore-collection-grid">
          {collections.map(({ title, description, query, icon: Icon }) => (
            <button className="explore-collection-card interactive-surface" key={title} onClick={() => selectTopic(query)}>
              <div><Icon /></div><span>Curated collection</span><h3>{title}</h3><p>{description}</p><strong>Open collection <ArrowRight /></strong>
            </button>
          ))}
        </div>
      </section>

      <section className="section explore-content-section">
        <div className="container">
          <div className="explore-toolbar">
            <div>
              <span className="overline">Browse the library</span>
              <h2>{searchParams.get("search") ? `Results for “${searchParams.get("search")}”` : category ? `${category.replaceAll("-", " ")} stories` : "Recommended for curious readers"}</h2>
              <p>{sortedPosts.length} {sortedPosts.length === 1 ? "story" : "stories"} available</p>
            </div>
            <label className="sort-control"><SlidersHorizontal size={17} /><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="popular">Most popular</option><option value="quick">Quick reads</option></select></label>
          </div>

          <div className="filter-row explore-filter-row">
            <button className={!category ? "active" : ""} onClick={() => selectCategory("")}>All topics</button>
            {categories.map((item) => (
              <button key={item.id} className={category === item.slug ? "active" : ""} onClick={() => selectCategory(item.slug)}>{item.name}</button>
            ))}
          </div>

          {featured && (
            <article className="explore-featured-story interactive-surface">
              <Link to={`/post/${featured.slug}`} className="explore-feature-image"><img src={featured.coverImage || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=80"} alt={featured.title} /><span><Flame size={15} /> Featured story</span></Link>
              <div className="explore-feature-content">
                <span className="overline">{featured.category?.name || "Editor's pick"}</span>
                <h2>{featured.title}</h2><p>{featured.excerpt}</p>
                <div className="explore-feature-meta"><span><Clock3 /> {featured.readTime} min read</span><span><Users /> By {featured.author.name}</span></div>
                <Link className="button button-primary" to={`/post/${featured.slug}`}>Read full story <ArrowRight /></Link>
              </div>
            </article>
          )}

          <div className="explore-main-layout">
            <div>
              <div className="post-grid explore-post-grid">
                {gridPosts.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
              {!sortedPosts.length && (
                <div className="empty-state explore-empty-state">
                  <BookOpen /><h3>No exact match yet</h3><p>Try a broader topic, or become the first writer to publish about it.</p>
                  <div><Link className="button button-primary" to="/write">Write this story</Link><button className="button button-ghost" onClick={() => { setSearch(""); setSearchParams({}); }}>Clear filters</button></div>
                </div>
              )}
            </div>

            <aside className="explore-sidebar-v5">
              <div className="discover-panel interactive-surface">
                <span className="overline">Discovery guide</span><h3>Find better reads faster</h3>
                <ul><li><Search /> Search a skill or problem</li><li><Clock3 /> Choose quick reads when short on time</li><li><Flame /> Sort by popularity for community favourites</li></ul>
              </div>
              <div className="writers-panel interactive-surface">
                <span className="overline">BlogVerse creators</span><h3>Meet the real voices</h3>
                {creators.map((creator) => (
                  <Link to={`/profile/${creator.id}`} className="writer-mini-card" key={creator.id}>
                    {creator.avatar ? <img className="avatar" src={creator.avatar} alt={creator.name} /> : <div className="avatar">{initials(creator.name)}</div>}
                    <div>
                      <strong>{creator.name}</strong>
                      <span>{creator.role === "ADMIN" ? "Founder & Creator" : creator.bio || `${creator._count?.posts || 0} published stories`}</span>
                    </div>
                    <ArrowRight />
                  </Link>
                ))}
                {!creators.length && <p className="creator-list-note">Creator names appear here after the demo seed or after users publish stories.</p>}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
