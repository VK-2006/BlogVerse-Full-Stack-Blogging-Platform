import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "blogverse_theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredTheme() {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.(DARK_QUERY)?.matches ? "dark" : "light";
}

function getInitialTheme() {
  return readStoredTheme() || getSystemTheme();
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", theme === "dark" ? "#07111f" : "#f6f7fb");
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [usesSystemTheme, setUsesSystemTheme] = useState(() => !readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!usesSystemTheme || !window.matchMedia) return undefined;

    const media = window.matchMedia(DARK_QUERY);
    const handleChange = (event) => setThemeState(event.matches ? "dark" : "light");
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, [usesSystemTheme]);

  function setTheme(nextTheme) {
    const normalized = nextTheme === "dark" ? "dark" : "light";
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // The UI still works when storage is blocked.
    }
    setUsesSystemTheme(false);
    setThemeState(normalized);
  }

  function resetToSystemTheme() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage restrictions.
    }
    setUsesSystemTheme(true);
    setThemeState(getSystemTheme());
  }

  const value = useMemo(() => ({
    theme,
    isDark: theme === "dark",
    usesSystemTheme,
    setTheme,
    resetToSystemTheme,
    toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark")
  }), [theme, usesSystemTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
  return context;
}
