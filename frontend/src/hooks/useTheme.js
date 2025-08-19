import { useEffect, useState } from "react";

const STORAGE_KEY = "theme"; // "dark" | "light" | "system"

export default function useTheme() {
  const [theme, setTheme] = useState(
    localStorage.getItem(STORAGE_KEY) || "system"
  );

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    root.classList.toggle("dark", isDark);
  }, [theme]);

  const cycle = () => {
    setTheme((t) => {
      const next = t === "system" ? "light" : t === "light" ? "dark" : "system";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return { theme, setTheme, cycle };
}
