import { CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

export default function ResetPassword() {
  const { token } = useParams();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password: form.password });
      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="account-action-page">
      <div className="account-action-glow secondary" />
      <section className="account-action-card">
        <div className="action-icon"><KeyRound /></div>
        {success ? (
          <div className="success-panel">
            <CheckCircle2 />
            <span className="overline">Password updated</span>
            <h1>You are ready to return</h1>
            <p>{success}</p>
            <Link className="button button-primary button-large full" to="/login">Sign in with new password</Link>
          </div>
        ) : (
          <>
            <span className="overline">Create new password</span>
            <h1>Secure your account</h1>
            <p>Use at least eight characters with uppercase, lowercase and a number.</p>
            <form className="form-stack" onSubmit={submit}>
              <label>
                New password
                <div className="input-with-icon"><LockKeyhole size={18} /><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
              </label>
              <label>
                Confirm new password
                <div className="input-with-icon"><LockKeyhole size={18} /><input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required /></div>
              </label>
              {error && <div className="form-error">{error}</div>}
              <button className="button button-primary button-large full" disabled={busy}>{busy ? "Updating..." : "Update password"}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
