import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function RouteTransition() {
  const location = useLocation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const frame = window.requestAnimationFrame(() => {
      const timer = window.setTimeout(() => setActive(false), 220);
      window.__blogverseRouteTimer = timer;
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (window.__blogverseRouteTimer) window.clearTimeout(window.__blogverseRouteTimer);
    };
  }, [location.pathname, location.search]);

  return <div className={`route-progress ${active ? "active" : ""}`} aria-hidden="true"><span /></div>;
}
