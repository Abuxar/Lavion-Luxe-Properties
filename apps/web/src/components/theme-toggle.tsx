"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "lavion.theme";

/**
 * The token system already supports all three states — system (no stamp),
 * data-theme="light" and data-theme="dark" — but nothing could set them.
 *
 * "System" is a real option rather than a two-way switch, so a visitor who
 * wants the site to follow their OS can get back to that after trying one.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Theme | null;
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      // Blocked storage: stay on system.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try {
      if (theme === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, theme);
    } catch {
      // Preference simply does not persist.
    }
  }, [theme, ready]);

  const next: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
  const glyph: Record<Theme, string> = { system: "Auto", light: "Light", dark: "Dark" };

  return (
    <button
      type="button"
      onClick={() => setTheme(next[theme])}
      aria-label={`Theme: ${glyph[theme]}. Switch to ${glyph[next[theme]]}.`}
      title={`Theme: ${glyph[theme]}`}
      className="label border border-line px-3 py-2 transition-colors hover:border-brass"
    >
      {glyph[theme]}
    </button>
  );
}
