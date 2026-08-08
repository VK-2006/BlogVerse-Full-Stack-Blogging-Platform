import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const selector = [
  ".post-card",
  ".category-card",
  ".stat-card",
  ".dashboard-panel",
  ".draft-card",
  ".article-cover",
  ".info-card",
  ".value-card",
  ".contact-card",
  ".community-post",
  ".community-composer",
  ".community-guide",
  ".profile-editor",
  ".profile-details-card",
  ".profile-activity-card",
  ".author-card",
  ".starter-card",
  ".community-preview-card",
  ".explore-collection-card",
  ".explore-featured-story",
  ".community-room-card",
  ".prompt-panel",
  ".community-pulse-card",
  ".section-heading",
  ".settings-card",
  ".admin-user-card",
  ".contact-form",
  ".account-action-card",
  ".comment",
  ".attachment-download-grid a",
  ".related-url-list a",
  ".about-stats > div",
  ".surface-card",
  ".admin-user-card",
  ".admin-post-card",
  ".admin-message-card",
  ".support-request-card"
].join(",");

const INITIAL_VIEWPORT_MARGIN = 96;

export default function PageEffects() {
  const location = useLocation();
  const { pathname, search, hash } = location;

  useLayoutEffect(() => {
    document.body.classList.remove("mobile-menu-open");

    if (!hash) {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const target = document.getElementById(hash.slice(1));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [pathname, search, hash]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

    const root = document.getElementById("root");
    if (!root) return undefined;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const supportsObserver = "IntersectionObserver" in window && "MutationObserver" in window;

    if (prefersReducedMotion || !supportsObserver) {
      root.querySelectorAll(selector).forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }

    let index = 0;
    const pendingFrames = new Set();

    const revealImmediatelyIfVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const isNearViewport =
        rect.bottom >= -INITIAL_VIEWPORT_MARGIN
        && rect.top <= window.innerHeight + INITIAL_VIEWPORT_MARGIN;

      if (!isNearViewport) return false;

      const frame = window.requestAnimationFrame(() => {
        element.classList.add("is-visible");
        pendingFrames.delete(frame);
      });
      pendingFrames.add(frame);
      return true;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.04, rootMargin: "96px 0px 96px 0px" }
    );

    const observeNewElements = () => {
      root.querySelectorAll(selector).forEach((element) => {
        if (element.dataset.revealReady === "true") return;
        element.dataset.revealReady = "true";
        element.classList.add("reveal-on-scroll");
        element.style.setProperty("--reveal-delay", `${Math.min(index++ % 6, 5) * 35}ms`);

        if (!revealImmediatelyIfVisible(element)) {
          observer.observe(element);
        }
      });
    };

    const timer = window.setTimeout(observeNewElements, 0);
    const mutationObserver = new MutationObserver(() => {
      window.requestAnimationFrame(observeNewElements);
    });
    mutationObserver.observe(root, { childList: true, subtree: true });

    const safetyTimer = window.setTimeout(() => {
      root.querySelectorAll(selector).forEach((element) => {
        if (!element.classList.contains("reveal-on-scroll") || element.classList.contains("is-visible")) return;
        const rect = element.getBoundingClientRect();
        if (rect.bottom >= -INITIAL_VIEWPORT_MARGIN && rect.top <= window.innerHeight + INITIAL_VIEWPORT_MARGIN) {
          element.classList.add("is-visible");
          observer.unobserve(element);
        }
      });
    }, 500);

    const updatePointerGlow = (event) => {
      const surface = event.target.closest?.(".interactive-surface");
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      surface.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
      surface.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
    };

    root.addEventListener("pointermove", updatePointerGlow, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(safetyTimer);
      pendingFrames.forEach((frame) => window.cancelAnimationFrame(frame));
      root.removeEventListener("pointermove", updatePointerGlow);
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, [pathname, search]);

  return null;
}
