import { AlertTriangle, CalendarClock, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState({ password: "", confirmation: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [deletionError, setDeletionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [scheduled, setScheduled] = useState(null);

  useEffect(() => {
    api.get("/users/account/status")
      .then(({ data }) => setAccount(data.account))
      .catch((requestError) => setLoadError(requestError.message));
  }, []);

  async function changePassword(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    try {
      const { data } = await api.post("/users/account/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordMessage(data.message);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (requestError) {
      setPasswordError(requestError.message);
    } finally {
      setPasswordBusy(false);
    }
  }

  async function scheduleDeletion(event) {
    event.preventDefault();
    setDeletionError("");
    setBusy(true);
    try {
      const { data } = await api.post("/users/account/deletion-request", form);
      setScheduled(data);
    } catch (requestError) {
      setDeletionError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    logout({ silent: true });
    navigate("/login", { replace: true });
  }

  return (
    <main className="page account-settings-page gradient-page">
      <section className="simple-header account-settings-header">
        <div className="container narrow">
          <ShieldCheck />
          <span className="overline">Security and privacy</span>
          <h1>Account settings</h1>
          <p>Manage your BlogVerse account, password, session details and permanent deletion request.</p>
        </div>
      </section>

      <section className="section compact-top">
        <div className="container account-settings-grid">
          <article className="settings-card interactive-surface">
            <div className="settings-card-icon"><KeyRound /></div>
            <div>
              <span className="overline">Account information</span>
              <h2>{user?.name}</h2>
              <p>{user?.email}</p>
              {loadError && <div className="form-error">{loadError}</div>}
              <dl className="account-detail-list">
                <div><dt>Role</dt><dd>{account?.role || user?.role}</dd></div>
                <div><dt>Last login</dt><dd>{account?.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : "Current session"}</dd></div>
                <div><dt>Account state</dt><dd><span className="account-status enabled">Enabled</span></dd></div>
              </dl>
            </div>
          </article>

          <article className="settings-card interactive-surface">
            <div className="settings-card-icon"><KeyRound /></div>
            <div className="danger-settings-content">
              <span className="overline">Password security</span>
              <h2>Change password</h2>
              <p>Use a unique password with uppercase, lowercase and a number. Changing it does not expose the new password to BlogVerse logs.</p>

              <form className="form-stack" onSubmit={changePassword}>
                <label>
                  Current password
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                    required
                  />
                </label>
                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                    required
                  />
                </label>
                {passwordMessage && <div className="form-success">{passwordMessage}</div>}
                {passwordError && <div className="form-error">{passwordError}</div>}
                <button className="button button-primary button-large" disabled={passwordBusy}>
                  <KeyRound size={18} /> {passwordBusy ? "Updating..." : "Update password"}
                </button>
              </form>
            </div>
          </article>

          <article className="settings-card danger-settings-card interactive-surface">
            <div className="settings-card-icon danger"><Trash2 /></div>
            <div className="danger-settings-content">
              <span className="overline danger-overline">Danger zone</span>
              <h2>Delete account</h2>
              <p>
                Your account is not deleted immediately. BlogVerse schedules permanent deletion after
                <strong> 30 days</strong>. During that period, sign in with the same email and password to recover it.
              </p>

              <div className="deletion-timeline">
                <div><CalendarClock /><span><strong>Today</strong> Deletion request starts</span></div>
                <div><ShieldCheck /><span><strong>Next 30 days</strong> Account can be recovered during login</span></div>
                <div><Trash2 /><span><strong>Day 30</strong> Account, posts and related data are permanently deleted</span></div>
              </div>

              <form className="form-stack delete-account-form" onSubmit={scheduleDeletion}>
                <label>
                  Confirm your password
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    placeholder="Enter your current password"
                    required
                  />
                </label>
                <label>
                  Type DELETE to confirm
                  <input
                    value={form.confirmation}
                    onChange={(event) => setForm({ ...form, confirmation: event.target.value.toUpperCase() })}
                    placeholder="DELETE"
                    autoComplete="off"
                    required
                  />
                </label>
                {deletionError && <div className="form-error">{deletionError}</div>}
                <button
                  className="button button-danger button-large"
                  disabled={busy || form.confirmation !== "DELETE" || !form.password}
                >
                  <AlertTriangle size={18} /> {busy ? "Scheduling..." : "Schedule account deletion"}
                </button>
              </form>
            </div>
          </article>
        </div>
      </section>

      {scheduled && (
        <div className="prompt-backdrop">
          <section className="app-prompt prompt-warning account-scheduled-prompt" role="dialog" aria-modal="true">
            <div className="prompt-icon"><CalendarClock size={28} /></div>
            <span className="overline">Deletion scheduled</span>
            <h2>Your 30-day recovery period has started</h2>
            <p>{scheduled.message}</p>
            <div className="prompt-date">
              Permanent deletion: <strong>{new Date(scheduled.deletionScheduledFor).toLocaleString()}</strong>
            </div>
            <p className="prompt-help">To recover, sign in again before this date and select <strong>Recover account</strong>.</p>
            <button className="button button-primary full" onClick={finish}>I understand — sign me out</button>
          </section>
        </div>
      )}
    </main>
  );
}
