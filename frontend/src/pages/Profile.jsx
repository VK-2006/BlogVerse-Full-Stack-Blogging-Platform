import {
  AtSign,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Edit3,
  ExternalLink,
  Globe2,
  Link as LinkIcon,
  Mail,
  MapPin,
  MessageCircle,
  Save,
  Settings,
  Share2,
  Sparkles,
  UserRound,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function initials(name = "BlogVerse Creator") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "BC";
}

function emptyProfileForm() {
  return {
    name: "",
    headline: "",
    occupation: "",
    location: "",
    website: "",
    socialLink: "",
    bio: "",
    avatar: ""
  };
}

export default function Profile() {
  const params = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const profileId = params.id || currentUser?.id;
  const isOwn = Boolean(currentUser && Number(profileId) === currentUser.id);
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyProfileForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) {
      navigate("/login");
      return;
    }

    setError("");
    setMessage("");
    setData(null);
    api.get(`/users/profile/${profileId}`)
      .then(({ data: response }) => {
        setData(response);
        setForm({
          name: response.user.name || "",
          headline: response.user.headline || "",
          occupation: response.user.occupation || "",
          location: response.user.location || "",
          website: response.user.website || "",
          socialLink: response.user.socialLink || "",
          bio: response.user.bio || "",
          avatar: response.user.avatar || ""
        });
      })
      .catch((requestError) => setError(requestError.message));
  }, [profileId, navigate]);

  async function saveProfile() {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const { data: response } = await api.patch("/users/profile", form);
      updateUser(response.user);
      setData((current) => ({ ...current, user: { ...current.user, ...response.user } }));
      setEditing(false);
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function shareProfile() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data.user.name} on BlogVerse`,
          text: data.user.headline || data.user.bio || "View this BlogVerse creator profile",
          url
        });
        return;
      } catch (shareError) {
        if (shareError.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const profileCompletion = useMemo(() => {
    if (!data?.user) return 0;
    const profile = data.user;
    const values = [profile.name, profile.headline, profile.occupation, profile.location, profile.website, profile.bio, profile.avatar];
    return Math.round((values.filter(Boolean).length / values.length) * 100);
  }, [data]);

  if (error && !data) {
    return <main className="page"><div className="empty-state"><h2>{error}</h2><button className="button button-primary" onClick={() => window.location.reload()}>Try again</button></div></main>;
  }
  if (!data) return <div className="page-loader">Loading creator profile...</div>;

  const profile = data.user;
  const creatorLabel = profile.role === "ADMIN" ? "BlogVerse Founder & Creator" : "BlogVerse Writer";

  return (
    <main className="page profile-page gradient-page">
      <section className="profile-hero">
        <div className="profile-cover-gradient" />
        <div className="container profile-hero-content profile-hero-stacked">
          <div className="profile-avatar-wrap">
            {profile.avatar
              ? <img src={profile.avatar} alt={profile.name} />
              : <div className="avatar profile-avatar">{initials(profile.name)}</div>}
          </div>

          <div className="profile-intro">
            <span className="overline">{creatorLabel}</span>
            <h1>{profile.name}</h1>
            {profile.headline && <h2 className="profile-headline">{profile.headline}</h2>}
            <p>{profile.bio || "Writer, reader and member of the BlogVerse community."}</p>
            <div className="profile-meta">
              {profile.occupation && <span><BriefcaseBusiness size={16} /> {profile.occupation}</span>}
              {profile.location && <span><MapPin size={16} /> {profile.location}</span>}
              <span><CalendarDays size={16} /> Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="profile-actions">
            {isOwn && (
              <>
                <button className="button button-ghost" onClick={() => setEditing((current) => !current)}>
                  {editing ? <X size={17} /> : <Edit3 size={17} />} {editing ? "Cancel" : "Edit profile"}
                </button>
                <Link className="button button-ghost" to="/settings/account"><Settings size={17} /> Account settings</Link>
              </>
            )}
            <button className="button button-primary" onClick={shareProfile}>
              {copied ? <Check size={17} /> : <Share2 size={17} />} {copied ? "Copied" : "Share profile"}
            </button>
          </div>
        </div>
      </section>

      <section className="section profile-content-section">
        <div className="container">
          {message && <div className="form-success">{message}</div>}
          {error && <div className="form-error">{error}</div>}

          <div className="profile-overview-grid">
            <aside className="profile-details-card interactive-surface">
              <div className="profile-details-heading">
                <div className="profile-detail-icon"><UserRound /></div>
                <div><span className="overline">Creator details</span><h2>About {profile.name.split(" ")[0]}</h2></div>
              </div>

              <dl className="profile-detail-list">
                {profile.occupation && <div><dt><BriefcaseBusiness /> Occupation</dt><dd>{profile.occupation}</dd></div>}
                {profile.location && <div><dt><MapPin /> Location</dt><dd>{profile.location}</dd></div>}
                {profile.website && <div><dt><Globe2 /> Website</dt><dd><a href={profile.website} target="_blank" rel="noreferrer">Visit website <ExternalLink size={14} /></a></dd></div>}
                {profile.socialLink && <div><dt><AtSign /> Social profile</dt><dd><a href={profile.socialLink} target="_blank" rel="noreferrer">Open profile <ExternalLink size={14} /></a></dd></div>}
                {isOwn && currentUser?.email && <div><dt><Mail /> Account email</dt><dd>{currentUser.email}</dd></div>}
                <div><dt><MessageCircle /> Comments</dt><dd>{profile._count.comments}</dd></div>
                <div><dt><Users /> Community shares</dt><dd>{profile._count.communityPosts}</dd></div>
              </dl>

              {isOwn && (
                <div className="profile-completion">
                  <div><span>Profile completeness</span><strong>{profileCompletion}%</strong></div>
                  <div className="profile-completion-track"><span style={{ width: `${profileCompletion}%` }} /></div>
                  <small>Complete your public details to help readers know you better.</small>
                </div>
              )}
            </aside>

            <div className="profile-main-column">
              {editing && (
                <div className="profile-editor interactive-surface">
                  <div><Sparkles /><div><span className="overline">Public identity</span><h2>Edit your creator profile</h2></div></div>
                  <div className="profile-form-grid">
                    <label>Full display name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter your full name" /></label>
                    <label>Professional headline<input value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} maxLength={120} placeholder="Example: Full-stack developer and writer" /></label>
                    <label>Occupation<input value={form.occupation} onChange={(event) => setForm({ ...form, occupation: event.target.value })} maxLength={120} placeholder="Your role or profession" /></label>
                    <label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength={120} placeholder="City, Country" /></label>
                    <label>Website URL<div className="profile-input-icon"><LinkIcon size={16} /><input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="https://yourwebsite.com" /></div></label>
                    <label>Social profile URL<div className="profile-input-icon"><AtSign size={16} /><input value={form.socialLink} onChange={(event) => setForm({ ...form, socialLink: event.target.value })} placeholder="https://linkedin.com/in/yourname" /></div></label>
                    <label className="full-field">Avatar image URL<input value={form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value })} placeholder="https://..." /></label>
                    <label className="full-field">Bio<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} maxLength={500} placeholder="Tell readers what you write about and what matters to you." /><small>{form.bio.length}/500 characters</small></label>
                  </div>
                  <button className="button button-primary" onClick={saveProfile} disabled={saving}><Save size={17} /> {saving ? "Saving..." : "Save profile"}</button>
                </div>
              )}

              <div className="section-heading profile-work-heading">
                <div><span className="overline">Published work</span><h2>{data.posts.length} stories by {profile.name}</h2></div>
                {isOwn && <Link className="button button-primary button-small" to="/write">Write a new story</Link>}
              </div>
              <div className="post-grid profile-post-grid">{data.posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
              {!data.posts.length && <div className="empty-state"><h3>No published stories yet</h3><p>Published posts will appear on this profile.</p></div>}

              <div className="profile-community-section">
                <div className="section-heading compact">
                  <div><span className="overline">Community activity</span><h2>Recent conversations and shares</h2></div>
                  <Link to="/communities">Open Communities</Link>
                </div>
                <div className="profile-activity-grid">
                  {data.communityShares.map((item) => (
                    <Link className="profile-activity-card interactive-surface" key={item.id} to={`/communities#community-${item.id}`}>
                      <Users />
                      <div>
                        <p>{item.content || "Shared a story with the community."}</p>
                        {item.sharedPost && <strong>{item.sharedPost.title}</strong>}
                        <span>{item._count.replies} replies · {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                {!data.communityShares.length && <div className="empty-state"><p>No community activity yet.</p></div>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
