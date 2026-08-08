import { FileCheck2, Scale } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <main className="page gradient-page legal-page">
      <section className="page-hero legal-hero">
        <div className="container narrow legal-hero-inner">
          <span className="eyebrow"><Scale size={16} /> Terms of Service</span>
          <h1>Rules for using BlogVerse.</h1>
          <p>These terms explain the basic conditions for creating an account, publishing content and participating in the BlogVerse community.</p>
          <div className="legal-meta">Last updated: August 8, 2026</div>
        </div>
      </section>

      <section className="section compact-top">
        <div className="container narrow legal-stack">
          <article className="surface-card legal-card legal-summary">
            <FileCheck2 />
            <div>
              <h2>Using BlogVerse</h2>
              <p>By creating an account or using BlogVerse, you agree to use the service lawfully, respect other users and follow these terms.</p>
            </div>
          </article>

          <article className="surface-card legal-card">
            <h2>1. Accounts</h2>
            <p>You are responsible for accurate account information and for keeping your credentials secure. You may sign in using email/password or supported social sign-in providers. Google sign-in does not grant elevated BlogVerse permissions.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>2. User content</h2>
            <p>You remain responsible for stories, comments, community posts, files, links and other material you submit. By publishing content, you give BlogVerse the permission reasonably necessary to host, store, display and distribute that content through the service.</p>
            <p>Only publish material you have the right to use and share.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>3. Acceptable use</h2>
            <ul>
              <li>Do not break applicable law or encourage unlawful activity.</li>
              <li>Do not impersonate others, mislead users or attempt account takeover.</li>
              <li>Do not publish malware, phishing material or malicious links.</li>
              <li>Do not harass, threaten or abuse other users.</li>
              <li>Do not upload content that infringes intellectual-property or privacy rights.</li>
              <li>Do not bypass authentication, authorization, moderation or security controls.</li>
              <li>Do not use automation in a way that disrupts or overloads the service.</li>
            </ul>
          </article>

          <article className="surface-card legal-card">
            <h2>4. Moderation and account action</h2>
            <p>BlogVerse may block posts, disable accounts or restrict access when content or activity violates these terms, creates security risk or disrupts the service.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>5. Downloads and external links</h2>
            <p>Authors may control whether certain posts are downloadable. Content may contain external links. BlogVerse is not responsible for third-party websites reached through those links.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>6. Social sign-in services</h2>
            <p>Google authentication is provided through a third-party platform and is also subject to Google's terms and policies. Social sign-in may be unavailable if Google is unavailable, access is revoked or provider requirements change.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>7. Account deletion</h2>
            <p>BlogVerse supports scheduled account deletion with a 30-day recovery period. After the recovery period, an account proceeding through the deletion workflow can be permanently removed along with account-linked content and interactions, subject to records that may need to be retained for legitimate support, security or legal purposes.</p>
            <Link className="legal-inline-link" to="/data-deletion">View Data Deletion Instructions →</Link>
          </article>

          <article className="surface-card legal-card">
            <h2>8. Service availability</h2>
            <p>BlogVerse may change, suspend or discontinue features and may experience outages or third-party service interruptions. The service is provided on an “as available” basis to the extent permitted by applicable law.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>9. Responsibility and limitations</h2>
            <p>To the extent permitted by applicable law, BlogVerse is not responsible for indirect losses arising from third-party services, user-generated content or interruptions outside its reasonable control. Nothing here excludes rights or responsibilities that cannot legally be excluded.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>10. Changes and contact</h2>
            <p>These terms may be updated as BlogVerse changes. Continued use after an updated version is published means the updated terms apply from their stated date.</p>
            <Link className="button button-primary" to="/contact">Contact BlogVerse</Link>
          </article>
        </div>
      </section>
    </main>
  );
}
