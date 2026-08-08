import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("email");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  async function requestCode(event, resend = false) {
    event?.preventDefault?.();
    setError("");
    setBusy(!resend);
    setResending(resend);

    try {
      const { data } = await api.post(
        "/auth/forgot-password",
        { email },
        { timeout: 30000 }
      );
      setResult(data);
      if (data.delivery === "queued") {
        setStage("otp");
        setOtp("");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
      setResending(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        "/auth/verify-reset-otp",
        { email, otp },
        { timeout: 20000 }
      );
      navigate(`/reset-password/${data.resetToken}`, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const emailUnavailable = result?.delivery === "unavailable";

  return (
    <main className="account-action-page">
      <div className="account-action-glow" />
      <section className="account-action-card">
        <Link className="back-link" to="/login"><ArrowLeft size={17} /> Back to sign in</Link>
        <div className="action-icon"><KeyRound /></div>

        {stage === "email" ? (
          <>
            <span className="overline">Password recovery</span>
            <h1>Forgot your password?</h1>
            <p>Enter your BlogVerse account email. We will send a secure 6-digit code through Brevo.</p>

            <form className="form-stack" onSubmit={requestCode}>
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
              {emailUnavailable && <div className="form-error"><AlertCircle size={18} /> {result.message}</div>}
              <button className="button button-primary button-large full" disabled={busy}>
                {busy ? "Sending code..." : "Send 6-digit code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <span className="overline">Verify your email</span>
            <h1>Enter the 6-digit code</h1>
            <p>We sent a password-reset code to <strong>{email}</strong>. It expires in {result?.expiresInMinutes || 10} minutes.</p>

            <div className="success-panel password-mail-success">
              <CheckCircle2 />
              <strong>Code sent</strong>
              <span>Check Inbox, Spam or Promotions if it does not appear immediately.</span>
            </div>

            <form className="form-stack" onSubmit={verifyCode}>
              <label>
                Verification code
                <div className="input-with-icon">
                  <ShieldCheck size={18} />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    required
                  />
                </div>
              </label>
              {error && <div className="form-error"><AlertCircle size={18} /> {error}</div>}
              <button className="button button-primary button-large full" disabled={busy || otp.length !== 6}>
                {busy ? "Verifying..." : "Verify code"}
              </button>
              <button
                type="button"
                className="button button-ghost button-large full"
                onClick={(event) => requestCode(event, true)}
                disabled={resending || busy}
              >
                <RefreshCw size={17} /> {resending ? "Sending again..." : "Resend code"}
              </button>
              <button
                type="button"
                className="button button-ghost full"
                onClick={() => { setStage("email"); setOtp(""); setError(""); }}
              >
                Use a different email
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
