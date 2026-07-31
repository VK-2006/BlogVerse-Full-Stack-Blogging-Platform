import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import PostCard from "../components/PostCard";
import api from "../services/api";

export default function Bookmarks() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get("/users/bookmarks").then(({ data }) => setPosts(data.posts));
  }, []);

  return (
    <main className="page">
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
          <div className="post-grid">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
          {!posts.length && <div className="empty-state"><h3>No saved stories</h3><p>Bookmark an article and it will appear here.</p></div>}
        </div>
      </section>
    </main>
  );
}
