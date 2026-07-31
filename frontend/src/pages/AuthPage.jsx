import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, RotateCcw, ShieldX, X } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const { user, login, register, recoverAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [blockedPrompt, setBlockedPrompt] = useState(null);

  if (user) return <Navigate to="/dashboard" replace />;

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (isLogin) await login({ email: form.email, password: form.password });
      else await register(form);
      navigate(location.state?.from?.pathname || "/dashboard");
    } catch (err) {
      if (err.code === "ACCOUNT_PENDING_DELETION") {
        setRecovery({
          token: err.responseData?.recoveryToken,
          deletionScheduledFor: err.responseData?.deletionScheduledFor,
          message: err.message
        });
      } else if (err.code === "ACCOUNT_DISABLED") {
        setBlockedPrompt({ message: err.message });
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmRecovery() {
    if (!recovery?.token) return;
    setBusy(true);
    setError("");
    try {
      await recoverAccount(recovery.token);
      setRecovery(null);
      navigate(location.state?.from?.pathname || "/dashboard");
    } catch (requestError) {
      setError(requestError.message);
      setRecovery(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <Link className="brand light-brand" to="/">
          <span className="brand-icon"><BookOpen /></span>
          <span>BlogVerse</span>
        </Link>
        <div>
          <span className="eyebrow">Create. Connect. Inspire.</span>
          <h1>Every great idea deserves a place to grow.</h1>
          <p>Join a thoughtful community of writers and readers.</p>
          <ul>
            <li><CheckCircle2 /> Publish beautiful stories</li>
            <li><CheckCircle2 /> Save drafts and manage your work</li>
            <li><CheckCircle2 /> Comment, like and bookmark posts</li>
          </ul>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <span className="overline">{isLogin ? "Welcome back" : "Join BlogVerse"}</span>
          <h2>{isLogin ? "Sign in to continue" : "Create your account"}</h2>
          <p>{isLogin ? "Continue your writing journey." : "Start publishing in less than a minute."}</p>

          <form onSubmit={submit} className="form-stack">
            {!isLogin && (
              <label>
                Full name
                <input name="name" value={form.name} onChange={update} placeholder="Your name" required />
              </label>
            )}
            <label>
              Email address
              <input name="email" type="email" value={form.email} onChange={update} placeholder="you@example.com" required />
            </label>
            <label>
              <span className="password-label-row">
                Password
                {isLogin && <Link to="/forgot-password">Forgot password?</Link>}
              </span>
              <input name="password" type="password" value={form.password} onChange={update} placeholder="Minimum 8 characters" required />
            </label>

            {error && <div className="form-error">{error}</div>}

            <button className="button button-primary button-large full" disabled={busy}>
              {busy ? "Please wait..." : isLogin ? "Sign in" : "Create account"} <ArrowRight size={18} />
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? "New to BlogVerse?" : "Already have an account?"}{" "}
            <Link to={isLogin ? "/register" : "/login"}>{isLogin ? "Create account" : "Sign in"}</Link>
          </p>
        </div>
      </section>

      {recovery && (
        <div className="prompt-backdrop">
          <section className="app-prompt prompt-warning" role="dialog" aria-modal="true">
            <button className="prompt-close" onClick={() => setRecovery(null)}><X size={18} /></button>
            <div className="prompt-icon"><AlertTriangle size={28} /></div>
            <span className="overline">30-day recovery window</span>
            <h2>Recover your account?</h2>
            <p>{recovery.message}</p>
            {recovery.deletionScheduledFor && (
              <div className="prompt-date">
                Permanent deletion: <strong>{new Date(recovery.deletionScheduledFor).toLocaleString()}</strong>
              </div>
            )}
            <div className="prompt-actions">
              <button className="button button-ghost" onClick={() => setRecovery(null)}>Not now</button>
              <button className="button button-primary" onClick={confirmRecovery} disabled={busy}>
                <RotateCcw size={17} /> {busy ? "Recovering..." : "Recover account"}
              </button>
            </div>
          </section>
        </div>
      )}

      {blockedPrompt && (
        <div className="prompt-backdrop">
          <section className="app-prompt prompt-warning" role="dialog" aria-modal="true">
            <button className="prompt-close" onClick={() => setBlockedPrompt(null)}><X size={18} /></button>
            <div className="prompt-icon"><ShieldX size={28} /></div>
            <span className="overline">Access denied</span>
            <h2>Account disabled</h2>
            <p>{blockedPrompt.message}</p>
            <Link className="button button-primary full" to="/contact" onClick={() => setBlockedPrompt(null)}>Contact support</Link>
          </section>
        </div>
      )}
    </main>
  );
}
