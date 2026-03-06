"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type FontSize = "normal" | "large" | "xlarge";

const FONT_SIZE_STORAGE_KEY = "licitafacil:fontSize";

interface AccessibilityContextValue {
  fontSize: FontSize;
  setFontSize: (fontSize: FontSize) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

function applyFontSizeClass(fontSize: FontSize) {
  const root = document.documentElement;
  root.classList.remove("font-large", "font-xlarge", "font-normal");

  if (fontSize === "large") {
    root.classList.add("font-large");
  } else if (fontSize === "xlarge") {
    root.classList.add("font-xlarge");
  }
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>("normal");

  useEffect(() => {
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (stored === "large" || stored === "xlarge" || stored === "normal") {
      setFontSizeState(stored);
      applyFontSizeClass(stored);
      return;
    }

    setFontSizeState("normal");
    applyFontSizeClass("normal");
  }, []);

  const setFontSize = (next: FontSize) => {
    setFontSizeState(next);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, next);
    applyFontSizeClass(next);
  };

  const value = useMemo(
    () => ({
      fontSize,
      setFontSize,
    }),
    [fontSize],
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility deve ser usado dentro de AccessibilityProvider");
  }
  return context;
}
