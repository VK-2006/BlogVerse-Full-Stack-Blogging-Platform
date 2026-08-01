import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, KeyRound, Mail, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setBusy(true);

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setResult(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function tryAnotherEmail() {
    setResult(null);
    setError("");
  }

  const emailUnavailable = result?.delivery === "unavailable";

  return (
    <main className="account-action-page">
      <div className="account-action-glow" />
      <section className="account-action-card">
        <Link className="back-link" to="/login"><ArrowLeft size={17} /> Back to sign in</Link>
        <div className="action-icon"><KeyRound /></div>

        {!result ? (
          <>
            <span className="overline">Password recovery</span>
            <h1>Forgot your password?</h1>
            <p>Enter your BlogVerse account email. A secure link will be valid for 30 minutes.</p>

            <form className="form-stack" onSubmit={submit}>
              <label>
                Email address
                <div className="input-with-icon">
                  <Mail size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>
              {error && <div className="form-error"><AlertCircle size={18} /> {error}</div>}
              <button className="button button-primary button-large full" disabled={busy}>
                {busy ? "Sending secure link..." : "Send reset link"}
              </button>
            </form>
          </>
        ) : (
          <div className={`success-panel ${emailUnavailable ? "password-mail-warning" : ""}`}>
            {emailUnavailable ? <AlertCircle /> : <CheckCircle2 />}
            <span className="overline">Password recovery</span>
            <h1>{emailUnavailable ? "Email delivery needs configuration" : "Check your email"}</h1>
            <p>{result.message}</p>

            {!emailUnavailable && (
              <div className="password-email-tips">
                <strong>Did not receive it?</strong>
                <span>Check Spam or Promotions, confirm the email spelling and allow a minute for delivery.</span>
              </div>
            )}

            {result.resetUrl && (
              <div className="development-link">
                <strong>Temporary demo reset link</strong>
                <a href={result.resetUrl}>Open reset-password page <ExternalLink size={15} /></a>
                <small>{result.developmentNote}</small>
              </div>
            )}

            <div className="password-result-actions">
              <button type="button" className="button button-ghost button-large full" onClick={tryAnotherEmail}>
                <RotateCcw size={17} /> Try another email
              </button>
              <Link className="button button-primary button-large full" to="/login">Return to sign in</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
