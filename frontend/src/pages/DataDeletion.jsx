import { CalendarClock, KeyRound, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function DataDeletion() {
  return (
    <main className="page gradient-page legal-page">
      <section className="page-hero legal-hero">
        <div className="container narrow legal-hero-inner">
          <span className="eyebrow"><Trash2 size={16} /> Data Deletion</span>
          <h1>Delete your BlogVerse account and associated data.</h1>
          <p>These instructions apply to email/password accounts and accounts created or linked through Google.</p>
          <div className="legal-meta">Last updated: August 8, 2026</div>
        </div>
      </section>

      <section className="section compact-top">
        <div className="container narrow legal-stack">
          <article className="surface-card legal-card legal-summary">
            <CalendarClock />
            <div>
              <h2>30-day recovery period</h2>
              <p>BlogVerse schedules deletion 30 days after a confirmed request. You can recover the account before that period ends.</p>
            </div>
          </article>

          <article className="surface-card legal-card">
            <h2>Delete your account from BlogVerse</h2>
            <ol className="legal-steps">
              <li>Sign in to your BlogVerse account.</li>
              <li>Open <strong>Account Settings</strong>.</li>
              <li>Scroll to <strong>Delete account</strong>.</li>
              <li>Enter your current password.</li>
              <li>Type <strong>DELETE</strong> in the confirmation field.</li>
              <li>Select <strong>Schedule account deletion</strong>.</li>
              <li>BlogVerse signs you out and starts the 30-day recovery period.</li>
            </ol>
            <Link className="button button-primary" to="/settings/account">Open Account Settings</Link>
          </article>

          <article className="surface-card legal-card">
            <h2>Used Google and do not know a BlogVerse password?</h2>
            <p>Use the password-reset flow with the same email address, set a new BlogVerse password, sign in, and then follow the deletion steps above.</p>
            <Link className="button button-ghost" to="/forgot-password"><KeyRound size={17} /> Reset password</Link>
          </article>

          <article className="surface-card legal-card">
            <h2>What happens after the request?</h2>
            <ul>
              <li>The account enters a 30-day recovery period.</li>
              <li>Before the deadline, the account can be recovered through the BlogVerse recovery flow.</li>
              <li>After the deadline, the account is eligible for permanent deletion through the BlogVerse deletion workflow.</li>
              <li>Account-linked posts and many related interactions are removed when the user record is permanently deleted.</li>
              <li>Some support records may remain disconnected from the deleted account where needed for support, security, audit or legal obligations.</li>
            </ul>
          </article>

          <article className="surface-card legal-card">
            <h2>Need help?</h2>
            <p>If you cannot access your account, contact BlogVerse support using the email address associated with the account. Support can help you understand the available recovery and deletion steps.</p>
            <Link className="button button-primary" to="/contact">Contact support</Link>
          </article>


        </div>
      </section>
    </main>
  );
}
