import {
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Mail,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  TicketCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import SupportThread from "../components/SupportThread";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const emptyForm = { name: "", email: "", subject: "", message: "" };

export default function Contact() {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    name: user?.name || "",
    email: user?.email || ""
  }));
  const [requests, setRequests] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyBusyId, setReplyBusyId] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user.name || "",
      email: current.email || user.email || ""
    }));
    loadRequests();
  }, [user?.id]);

  async function loadRequests() {
    if (!user) return;
    setLoadingRequests(true);
    try {
      const { data } = await api.get("/contact/mine");
      setRequests(data.messages || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingRequests(false);
    }
  }

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setTicket(null);
    setError("");
    setBusy(true);

    try {
      const { data } = await api.post("/contact", form);
      setTicket({ ...data.contact, message: data.message });
      setForm({
        ...emptyForm,
        name: user?.name || "",
        email: user?.email || ""
      });
      if (user) await loadRequests();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendFollowUp(event, item) {
    event.preventDefault();
    const message = String(replyDrafts[item.id] || "").trim();
    if (message.length < 2) return;

    setReplyBusyId(item.id);
    setError("");
    try {
      const { data } = await api.post(`/contact/${item.id}/reply`, { message });
      setReplyDrafts((current) => ({ ...current, [item.id]: "" }));
      setTicket({ ticketCode: item.ticketCode, message: data.message });
      await loadRequests();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReplyBusyId(null);
    }
  }

  return (
    <main className="page contact-page">
      <section className="page-hero contact-hero">
        <div className="container page-hero-inner centered-hero">
          <span className="eyebrow"><MessageSquareText size={16} /> Contact BlogVerse</span>
          <h1>Let’s solve it together.</h1>
          <p>Send your question to the BlogVerse team. Every request receives a ticket and stays in one continuous conversation with the administrator.</p>
        </div>
      </section>

      <section className="section contact-main-section">
        <div className="container contact-layout">
          <aside className="contact-info-panel">
            <span className="overline">Support that stays organised</span>
            <h2>Clear questions. Trackable conversations.</h2>
            <p>Messages are stored in the database. Administrators can respond from the dashboard, and you can reply again inside the same ticket.</p>

            <div className="contact-benefit-list">
              <article><TicketCheck /><div><h3>Ticket tracking</h3><p>Every new request gets a unique BlogVerse ticket code.</p></div></article>
              <article><ShieldCheck /><div><h3>Admin inbox</h3><p>Only authorised administrators can manage support conversations.</p></div></article>
              <article><Mail /><div><h3>Brevo email delivery</h3><p>Administrator responses are also sent through the configured Brevo transactional email API.</p></div></article>
              <article><Clock3 /><div><h3>Conversation history</h3><p>Signed-in users can continue a ticket without creating disconnected requests.</p></div></article>
            </div>

            <div className="support-note">
              <LifeBuoy />
              <div><strong>Account access issue?</strong><p>Use Forgot Password for a secure reset. Use this form for all other support requests.</p></div>
            </div>
          </aside>

          <form className="contact-form surface-card" onSubmit={submit}>
            <div className="form-heading">
              <span className="overline">Start a support ticket</span>
              <h2>How can we help?</h2>
              <p>Give us enough detail so the administrator can reply clearly.</p>
            </div>

            <div className="form-two-column">
              <label>Full name<input name="name" value={form.name} onChange={update} placeholder="Your name" required /></label>
              <label>Email address<input name="email" type="email" value={form.email} onChange={update} placeholder="you@example.com" required /></label>
            </div>
            <label>Subject<input name="subject" value={form.subject} onChange={update} placeholder="What do you need help with?" required /></label>
            <label>Message<textarea name="message" value={form.message} onChange={update} placeholder="Describe the issue, what you expected and what happened..." required /></label>

            {ticket && (
              <div className="ticket-success">
                <CheckCircle2 />
                <div><strong>{ticket.message}</strong>{ticket.ticketCode && <span>Ticket: {ticket.ticketCode}</span>}</div>
              </div>
            )}
            {error && <div className="form-error">{error}</div>}

            <button className="button button-primary button-large full" disabled={busy}>
              {busy ? "Sending message..." : "Send message"} <Send size={18} />
            </button>
          </form>
        </div>
      </section>

      {user && (
        <section className="section support-history-section">
          <div className="container">
            <div className="section-heading">
              <div><span className="overline">Your support history</span><h2>Requests and administrator responses</h2></div>
              <button className="button button-ghost" onClick={loadRequests} disabled={loadingRequests}><RefreshCw size={17} /> Refresh</button>
            </div>

            {loadingRequests && !requests.length ? (
              <div className="page-loader compact-loader">Loading support requests...</div>
            ) : requests.length ? (
              <div className="support-request-grid support-thread-grid">
                {requests.map((item) => (
                  <article className="support-request-card surface-card support-conversation-card" key={item.id}>
                    <div className="support-request-head">
                      <div><span className="ticket-code">{item.ticketCode || `BV-LEGACY-${item.id}`}</span><h3>{item.subject}</h3></div>
                      <span className={`support-status status-${item.status.toLowerCase()}`}>{item.status.replaceAll("_", " ")}</span>
                    </div>

                    <SupportThread ticket={item} audience="user" />

                    <form className="support-followup-form" onSubmit={(event) => sendFollowUp(event, item)}>
                      <label>
                        {item.status === "CLOSED" ? "Reply to reopen this ticket" : "Reply to the administrator"}
                        <textarea
                          value={replyDrafts[item.id] || ""}
                          onChange={(event) => setReplyDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                          placeholder={item.status === "CLOSED" ? "Add a new response and this ticket will return to the admin inbox..." : "Continue this conversation..."}
                          maxLength={3000}
                        />
                      </label>
                      <div className="support-followup-actions">
                        <span>{String(replyDrafts[item.id] || "").length}/3000</span>
                        <button className="button button-primary" disabled={replyBusyId === item.id || String(replyDrafts[item.id] || "").trim().length < 2}>
                          <Send size={16} /> {replyBusyId === item.id ? "Sending..." : item.status === "CLOSED" ? "Reopen & send" : "Send response"}
                        </button>
                      </div>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state"><TicketCheck /><h3>No support requests yet</h3><p>Your submitted tickets will appear here.</p></div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
