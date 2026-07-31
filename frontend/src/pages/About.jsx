import { ArrowRight, BookOpenCheck, HeartHandshake, Lightbulb, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function About() {
  const values = [
    [Lightbulb, "Ideas first", "We make it easy for thoughtful ideas to become clear, beautiful stories."],
    [Users, "Community always", "Readers and writers grow through respectful conversation and shared curiosity."],
    [ShieldCheck, "Safe by design", "Strong authentication and responsible data handling are built into the platform."],
    [HeartHandshake, "Creator friendly", "Writers keep control of their drafts, published work and personal voice."]
  ];

  return (
    <main className="page about-page">
      <section className="about-hero">
        <div className="about-orb orb-a" /><div className="about-orb orb-b" />
        <div className="container about-hero-grid">
          <div>
            <span className="eyebrow"><Sparkles size={16} /> About BlogVerse</span>
            <h1>A better home for ideas that matter.</h1>
            <p>BlogVerse is a modern full-stack publishing platform designed to help people write with confidence, discover meaningful perspectives and build genuine communities.</p>
            <Link className="button button-light button-large" to="/register">Join the community <ArrowRight size={18} /></Link>
          </div>
          <div className="about-visual">
            <div className="floating-note note-one">Create</div>
            <div className="floating-note note-two">Connect</div>
            <div className="floating-note note-three">Inspire</div>
            <div className="about-visual-core"><BookOpenCheck /></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container story-grid">
          <div>
            <span className="overline">Our story</span>
            <h2>Publishing should feel simple, human and inspiring.</h2>
          </div>
          <div>
            <p>Many platforms make writing feel complicated or noisy. BlogVerse focuses on what matters: a clean editor, a beautiful reading experience, secure accounts and meaningful interaction.</p>
            <p>It combines a React interface with an Express API, MySQL data storage and features such as drafts, comments, likes, bookmarks and password recovery.</p>
          </div>
        </div>
      </section>

      <section className="section values-section">
        <div className="container">
          <div className="section-heading">
            <div><span className="overline">What guides us</span><h2>Values behind the platform</h2></div>
          </div>
          <div className="values-grid">
            {values.map(([Icon, title, description]) => (
              <article className="value-card" key={title}>
                <div><Icon /></div><h3>{title}</h3><p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container about-stats">
          <div><strong>Responsive</strong><span>Desktop, tablet and mobile layouts</span></div>
          <div><strong>Secure</strong><span>JWT, hashed passwords and reset tokens</span></div>
          <div><strong>Complete</strong><span>Frontend, backend and database</span></div>
          <div><strong>Modern</strong><span>Animations and accessible interactions</span></div>
        </div>
      </section>
    </main>
  );
}
