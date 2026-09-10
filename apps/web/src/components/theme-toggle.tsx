"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "lavion.theme";

/**
 * Two states only: light and dark.
 *
 * There is no "auto" option to pick. The system preference is still used to
 * choose the *initial* theme on a first visit — so nobody is dropped into the
 * wrong one — but once the visitor chooses, that choice sticks and the control
 * is a simple switch between two.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let initial: Theme;
    try {
      const saved = localStorage.getItem(KEY);
      initial =
        saved === "light" || saved === "dark"
          ? saved
          : window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark";
    } catch {
      // Blocked storage — fall back to whatever is already stamped.
      initial =
        document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    }
    setTheme(initial);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Preference simply does not persist.
    }
  }, [theme, ready]);

  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="inline-flex h-[34px] w-[34px] items-center justify-center border border-line transition-colors hover:border-brass"
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
}

function Sun() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function Moon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
