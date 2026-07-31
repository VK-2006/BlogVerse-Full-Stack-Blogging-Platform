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
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const emptyForm = { name: "", email: "", subject: "", message: "" };

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

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

  return (
    <main className="page contact-page">
      <section className="page-hero contact-hero">
        <div className="container page-hero-inner centered-hero">
          <span className="eyebrow"><MessageSquareText size={16} /> Contact BlogVerse</span>
          <h1>Let’s solve it together.</h1>
          <p>Send your question to the BlogVerse team. Every request receives a ticket and appears in the administrator support inbox.</p>
        </div>
      </section>

      <section className="section contact-main-section">
        <div className="container contact-layout">
          <aside className="contact-info-panel">
            <span className="overline">Support that stays organised</span>
            <h2>Clear questions. Trackable replies.</h2>
            <p>Messages are stored securely in the database. Administrators can review, reply and close requests from the admin dashboard.</p>

            <div className="contact-benefit-list">
              <article><TicketCheck /><div><h3>Ticket tracking</h3><p>Every submission gets a unique BlogVerse ticket code.</p></div></article>
              <article><ShieldCheck /><div><h3>Admin inbox</h3><p>Only authorised administrators can view and reply.</p></div></article>
              <article><Mail /><div><h3>Email-ready</h3><p>Replies are emailed when SMTP is configured.</p></div></article>
              <article><Clock3 /><div><h3>Response history</h3><p>Signed-in users can review replies from this page.</p></div></article>
            </div>

            <div className="support-note">
              <LifeBuoy />
              <div><strong>Account access issue?</strong><p>Use Forgot Password for a secure reset. Use this form for all other support requests.</p></div>
            </div>
          </aside>

          <form className="contact-form surface-card" onSubmit={submit}>
            <div className="form-heading">
              <span className="overline">Send a message</span>
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
                <div><strong>{ticket.message}</strong><span>Ticket: {ticket.ticketCode}</span></div>
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
              <div><span className="overline">Your support history</span><h2>Requests and administrator replies</h2></div>
              <button className="button button-ghost" onClick={loadRequests} disabled={loadingRequests}><RefreshCw size={17} /> Refresh</button>
            </div>

            {loadingRequests && !requests.length ? (
              <div className="page-loader compact-loader">Loading support requests...</div>
            ) : requests.length ? (
              <div className="support-request-grid">
                {requests.map((item) => (
                  <article className="support-request-card surface-card" key={item.id}>
                    <div className="support-request-head">
                      <div><span className="ticket-code">{item.ticketCode || `BV-LEGACY-${item.id}`}</span><h3>{item.subject}</h3></div>
                      <span className={`support-status status-${item.status.toLowerCase()}`}>{item.status.replaceAll("_", " ")}</span>
                    </div>
                    <p className="support-user-message">{item.message}</p>
                    <div className="support-time-row"><span>Sent {formatDate(item.createdAt)}</span>{item.repliedAt && <span>Replied {formatDate(item.repliedAt)}</span>}</div>
                    {item.adminReply ? (
                      <div className="admin-reply-box">
                        <strong>BlogVerse administrator replied</strong>
                        <p>{item.adminReply}</p>
                        <small>{item.repliedByAdmin?.name || "Administrator"}</small>
                      </div>
                    ) : (
                      <div className="support-pending-box"><Clock3 size={17} /> Awaiting administrator response</div>
                    )}
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
