import { ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";
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
    setBusy(true);

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

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
            <p>Enter your account email and we will prepare a secure reset link.</p>

            <form className="form-stack" onSubmit={submit}>
              <label>
                Email address
                <div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></div>
              </label>
              {error && <div className="form-error">{error}</div>}
              <button className="button button-primary button-large full" disabled={busy}>
                {busy ? "Preparing link..." : "Send reset link"}
              </button>
            </form>
          </>
        ) : (
          <div className="success-panel">
            <CheckCircle2 />
            <span className="overline">Request received</span>
            <h1>Check your email</h1>
            <p>{result.message}</p>
            {result.resetUrl && (
              <div className="development-link">
                <strong>Local development reset link</strong>
                <a href={result.resetUrl}>Open reset-password page</a>
                <small>{result.developmentNote}</small>
              </div>
            )}
            <Link className="button button-ghost button-large full" to="/login">Return to sign in</Link>
          </div>
        )}
      </section>
    </main>
  );
}
