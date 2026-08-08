import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const OAUTH_PENDING_KEY = "blogverse_oauth_pending";
const OAUTH_BROWSER_TTL_MS = 10 * 60 * 1000;

function readPendingOAuth() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(OAUTH_PENDING_KEY) || "null");
    if (!value || !["google", "facebook"].includes(value.provider) || !value.state) return null;
    if (!Number.isFinite(Number(value.createdAt)) || Date.now() - Number(value.createdAt) > OAUTH_BROWSER_TTL_MS) return null;
    return value;
  } catch {
    return null;
  }
}

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { completeOAuth } = useAuth();
  const handled = useRef(false);
  const [status, setStatus] = useState("Completing secure sign-in...");
  const [error, setError] = useState("");

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const providerError = params.get("error");
    const providerMessage = params.get("error_description") || params.get("message");
    const code = params.get("code");
    const returnedState = params.get("state");
    const pending = readPendingOAuth();

    window.history.replaceState({}, document.title, "/oauth/callback");

    if (!pending) {
      window.sessionStorage.removeItem(OAUTH_PENDING_KEY);
      setError("This social sign-in session is missing or expired. Please start again from the login page.");
      setStatus("");
      return;
    }

    if (!returnedState || returnedState !== pending.state) {
      window.sessionStorage.removeItem(OAUTH_PENDING_KEY);
      setError("The social sign-in session could not be verified in this browser. Please try again from the login page.");
      setStatus("");
      return;
    }

    if (providerError) {
      window.sessionStorage.removeItem(OAUTH_PENDING_KEY);
      setError(providerMessage || "Social sign-in was cancelled or permission was not granted.");
      setStatus("");
      return;
    }

    if (!code) {
      window.sessionStorage.removeItem(OAUTH_PENDING_KEY);
      setError("The social sign-in response is incomplete. Please try again.");
      setStatus("");
      return;
    }

    window.sessionStorage.removeItem(OAUTH_PENDING_KEY);
    let active = true;

    api.post(
      `/auth/oauth/${pending.provider}/complete`,
      { code, state: returnedState },
      { timeout: 20000, skipRetry: true }
    )
      .then(({ data }) => {
        if (!active) return;
        completeOAuth(data);
        setStatus("Signed in successfully. Opening your dashboard...");
        window.setTimeout(() => navigate("/dashboard", { replace: true }), 350);
      })
      .catch((requestError) => {
        if (!active) return;
        setStatus("");
        setError(requestError.message || "Social sign-in could not be completed.");
      });

    return () => {
      active = false;
    };
  }, [completeOAuth, navigate, params]);

  return (
    <main className="page oauth-callback-page gradient-page">
      <section className="oauth-callback-card surface-card">
        {error ? (
          <>
            <span className="oauth-result-icon error"><AlertTriangle /></span>
            <span className="overline">Social sign-in</span>
            <h1>We couldn’t sign you in.</h1>
            <p>{error}</p>
            <div className="oauth-callback-actions">
              <Link className="button button-primary" to="/login">Try sign in again</Link>
              <Link className="button button-ghost" to="/contact">Contact support</Link>
            </div>
          </>
        ) : (
          <>
            <span className="oauth-result-icon success">{status.startsWith("Signed") ? <CheckCircle2 /> : <LoaderCircle className="spin" />}</span>
            <span className="overline">Secure social sign-in</span>
            <h1>{status.startsWith("Signed") ? "You’re signed in." : "Finishing your login..."}</h1>
            <p>{status}</p>
          </>
        )}
      </section>
    </main>
  );
}
