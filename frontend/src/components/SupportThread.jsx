import { MessageSquareText, ShieldCheck, UserRound } from "lucide-react";

function timeline(ticket) {
  const entries = [
    {
      id: `initial-${ticket.id}`,
      actor: "USER",
      senderName: ticket.name || ticket.user?.name || "User",
      message: ticket.message,
      createdAt: ticket.createdAt
    },
    ...(ticket.threadEntries || [])
  ];

  const hasAdminThreadEntry = (ticket.threadEntries || []).some((entry) => entry.actor === "ADMIN");
  if (ticket.adminReply && !hasAdminThreadEntry) {
    entries.push({
      id: `legacy-admin-${ticket.id}`,
      actor: "ADMIN",
      senderName: ticket.repliedByAdmin?.name || "BlogVerse Administrator",
      message: ticket.adminReply,
      createdAt: ticket.repliedAt || ticket.updatedAt
    });
  }

  return entries
    .filter((entry) => entry.message)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "";
}

export default function SupportThread({ ticket, audience = "user", compact = false }) {
  const items = timeline(ticket);

  return (
    <div className={`support-thread ${compact ? "compact" : ""}`}>
      {items.map((entry) => {
        const isAdmin = entry.actor === "ADMIN";
        const label = isAdmin
          ? (entry.senderName || "BlogVerse Administrator")
          : audience === "user"
            ? "You"
            : (entry.senderName || ticket.name || "User");

        return (
          <div className={`support-thread-entry ${isAdmin ? "admin" : "user"}`} key={entry.id}>
            <span className="support-thread-avatar">{isAdmin ? <ShieldCheck size={17} /> : <UserRound size={17} />}</span>
            <div>
              <header><strong>{label}</strong><span>{formatDate(entry.createdAt)}</span></header>
              <p>{entry.message}</p>
            </div>
          </div>
        );
      })}
      {!items.length && <div className="support-thread-empty"><MessageSquareText size={17} /> No conversation yet.</div>}
    </div>
  );
}
