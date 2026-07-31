import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const icons = {
  success: CheckCircle2,
  recovered: CheckCircle2,
  warning: AlertTriangle,
  info: Info
};

export default function AppPrompt() {
  const { notice, clearNotice } = useAuth();
  if (!notice) return null;

  const Icon = icons[notice.type] || Info;

  return (
    <div className="prompt-backdrop" role="presentation" onMouseDown={clearNotice}>
      <section
        className={`app-prompt prompt-${notice.type || "info"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-prompt-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="prompt-close" onClick={clearNotice} aria-label="Close prompt"><X size={18} /></button>
        <div className="prompt-icon"><Icon size={28} /></div>
        <span className="overline">BlogVerse account</span>
        <h2 id="app-prompt-title">{notice.title}</h2>
        <p>{notice.message}</p>
        <button className="button button-primary full" onClick={clearNotice}>Continue</button>
      </section>
    </div>
  );
}
