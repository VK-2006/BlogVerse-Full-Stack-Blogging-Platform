import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

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
    const providerMessage = params.get("message");
    const code = params.get("code");
    const provider = params.get("provider");
    const returnedState = params.get("state");
    const storageKey = provider ? `blogverse_oauth_state_${provider}` : "";
    const expectedState = storageKey ? window.sessionStorage.getItem(storageKey) : "";

    window.history.replaceState({}, document.title, "/oauth/callback");

    if (providerError) {
      setError(providerMessage || "Social sign-in could not be completed.");
      setStatus("");
      return;
    }

    if (!code || !provider || !["google", "facebook"].includes(provider)) {
      setError("The social sign-in response is incomplete. Please try again.");
      setStatus("");
      return;
    }

    if (!returnedState || !expectedState || returnedState !== expectedState) {
      if (storageKey) window.sessionStorage.removeItem(storageKey);
      setError("The social sign-in session could not be verified in this browser. Please try again from the login page.");
      setStatus("");
      return;
    }

    window.sessionStorage.removeItem(storageKey);
    let active = true;

    api.post("/auth/oauth/exchange", { code }, { timeout: 15000, skipRetry: true })
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
