"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("theme");
    const nextIsDark = storedTheme ? storedTheme === "dark" : true;

    document.documentElement.classList.toggle("dark", nextIsDark);
    queueMicrotask(() => {
      setIsDark(nextIsDark);
    });
  }, []);

  function toggleTheme() {
    const nextIsDark = !isDark;

    document.documentElement.classList.toggle("dark", nextIsDark);
    window.localStorage.setItem("theme", nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  }

  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
        className ??
          "absolute right-5 top-5 z-30 border-border bg-card/70 text-foreground shadow-[var(--photo-shadow)] backdrop-blur hover:bg-accent sm:right-8 sm:top-8"
      )}
    >
      <Icon className="size-5 sm:size-5" strokeWidth={2.4} />
    </button>
  );
}
