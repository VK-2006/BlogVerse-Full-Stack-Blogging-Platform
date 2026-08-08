import { Bookmark, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PostCard from "../components/PostCard";
import api from "../services/api";

export default function Bookmarks() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/users/bookmarks");
      setPosts(data.posts || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="page bookmarks-page gradient-page">
      <section className="simple-header">
        <div className="container">
          <Bookmark />
          <span className="overline">Your library</span>
          <h1>Saved stories</h1>
          <p>Everything you bookmarked, ready when you are.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {error && (
            <div className="form-error bookmarks-status">
              <span>{error}</span>
              <button className="button button-ghost button-small" type="button" onClick={load}>
                <RefreshCw size={16} /> Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="page-loader compact-loader">Loading saved stories...</div>
          ) : posts.length ? (
            <div className="post-grid">
              {posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          ) : (
            <div className="empty-state">
              <Bookmark />
              <h3>No saved stories</h3>
              <p>Bookmark an article and it will appear here.</p>
              <Link className="button button-primary" to="/explore">Explore stories</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
