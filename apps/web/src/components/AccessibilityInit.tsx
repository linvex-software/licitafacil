"use client";

import { useEffect } from "react";
import { loadAccessibilityPrefs } from "@/lib/accessibility";

export function AccessibilityInit() {
  useEffect(() => {
    loadAccessibilityPrefs();
  }, []);

  return null;
}
