import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function AmbientUI() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setVisible(scrollTop > 560);
      setProgress(Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
      <div className="app-ambient" aria-hidden="true">
        <span className="ambient-mesh" />
        <span className="ambient-blob ambient-blob-one" />
        <span className="ambient-blob ambient-blob-two" />
        <span className="ambient-blob ambient-blob-three" />
      </div>
      <div className="reading-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <button
        type="button"
        className={`back-to-top ${visible ? "visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        title="Back to top"
      >
        <Sparkles className="back-to-top-spark" size={13} />
        <ArrowUp size={19} />
      </button>
    </>
  );
}
