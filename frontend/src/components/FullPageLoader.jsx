import { BookOpen } from "lucide-react";

export default function FullPageLoader({ message = "Preparing BlogVerse...", compact = false }) {
  return (
    <div className={`app-loader ${compact ? "app-loader-compact" : ""}`} role="status" aria-live="polite">
      <div className="app-loader-visual" aria-hidden="true">
        <span className="app-loader-orbit orbit-one" />
        <span className="app-loader-orbit orbit-two" />
        <span className="app-loader-logo"><BookOpen size={30} /></span>
      </div>
      <strong>BlogVerse</strong>
      <span>{message}</span>
      <div className="app-loader-bar"><i /></div>
    </div>
  );
}
