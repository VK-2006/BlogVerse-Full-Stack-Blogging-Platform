import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <main className="page gradient-page legal-page">
      <section className="page-hero legal-hero">
        <div className="container narrow legal-hero-inner">
          <span className="eyebrow"><ShieldCheck size={16} /> Privacy Policy</span>
          <h1>How BlogVerse handles your information.</h1>
          <p>This policy describes the information BlogVerse currently processes to provide accounts, publishing, community features, support and social sign-in.</p>
          <div className="legal-meta">Last updated: August 8, 2026</div>
        </div>
      </section>

      <section className="section compact-top">
        <div className="container narrow legal-stack">
          <article className="surface-card legal-card legal-summary">
            <LockKeyhole />
            <div>
              <h2>Privacy summary</h2>
              <p>BlogVerse uses account data to operate the service. Google profile data is used for sign-in/account linking. Provider access tokens are used only during the sign-in exchange and are not stored by BlogVerse.</p>
            </div>
          </article>

          <article className="surface-card legal-card">
            <h2>1. Information we collect</h2>
            <ul>
              <li><strong>Account information:</strong> name, email address, password hash, avatar, bio, headline, occupation, location, website and social profile link.</li>
              <li><strong>Social sign-in information:</strong> Google provider identifier, provider email, name and profile picture when available.</li>
              <li><strong>Content and activity:</strong> posts, drafts, attachments, links, comments, likes, bookmarks, community posts, replies and related timestamps.</li>
              <li><strong>Support information:</strong> contact name, email, subject, support messages, ticket history and administrator replies.</li>
              <li><strong>Account/security activity:</strong> last-login and last-seen timestamps, password-reset records, account status and deletion scheduling information.</li>
            </ul>
          </article>

          <article className="surface-card legal-card">
            <h2>2. How we use information</h2>
            <ul>
              <li>Create, authenticate, secure and maintain BlogVerse accounts.</li>
              <li>Link Google sign-in to the correct BlogVerse account.</li>
              <li>Publish and display user-created content and community interactions.</li>
              <li>Provide bookmarks, likes, comments, downloads, profile and dashboard features.</li>
              <li>Respond to support requests and maintain support ticket conversations.</li>
              <li>Moderate content/accounts, prevent abuse and protect service security.</li>
              <li>Process account recovery, password resets and deletion requests.</li>
            </ul>
          </article>

          <article className="surface-card legal-card">
            <h2>3. Google sign-in</h2>
            <p>When you choose a social sign-in provider, BlogVerse redirects you to that provider. After authorization, BlogVerse uses the returned authorization code on the server to obtain the profile details needed for authentication.</p>
            <p>The current Google integration requests OpenID, email and profile scopes. Google does not determine BlogVerse roles; authorization roles are controlled by BlogVerse.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>4. Passwords, sessions and browser storage</h2>
            <p>Passwords are stored as one-way hashes rather than plain text. BlogVerse stores its session token in browser local storage. Temporary OAuth state is stored in browser session storage for the sign-in flow and removed after the flow completes.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>5. Sharing and service providers</h2>
            <p>BlogVerse may use infrastructure, database, email-delivery, hosting and media/storage providers to operate the service. Information is shared with those providers only as needed for the relevant functionality. Social sign-in information is exchanged with Google when you choose those sign-in options.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>6. Retention and account deletion</h2>
            <p>BlogVerse provides a 30-day account-deletion recovery period. A deletion request can be scheduled from Account Settings. During the recovery period the account can be recovered. After the scheduled deletion date, the account is subject to permanent deletion through the service's deletion workflow.</p>
            <p>Deleting a user account removes account-linked records configured to cascade with that account, such as posts and many related interactions. Some support records may be retained in a de-identified or disconnected form where needed for support, security, audit or legal obligations.</p>
            <Link className="legal-inline-link" to="/data-deletion">Read the Data Deletion Instructions →</Link>
          </article>

          <article className="surface-card legal-card">
            <h2>7. Your choices</h2>
            <ul>
              <li>Update editable profile information from your profile.</li>
              <li>Change or reset your password using account-security tools.</li>
              <li>Revoke Google access from the Google Account settings.</li>
              <li>Request BlogVerse account deletion using the deletion workflow.</li>
              <li>Contact BlogVerse support with privacy or account questions.</li>
            </ul>
          </article>

          <article className="surface-card legal-card">
            <h2>8. Security</h2>
            <p>BlogVerse uses technical safeguards including password hashing, authenticated API routes, role-based authorization and signed OAuth state validation. No online service can guarantee absolute security.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>9. Changes</h2>
            <p>BlogVerse may update this policy as the service changes. Material changes should be reflected by updating the date shown at the top of this page.</p>
          </article>

          <article className="surface-card legal-card">
            <h2>10. Contact</h2>
            <p>For privacy, access or deletion questions, use the BlogVerse support page.</p>
            <Link className="button button-primary" to="/contact">Contact BlogVerse</Link>
          </article>
        </div>
      </section>
    </main>
  );
}
