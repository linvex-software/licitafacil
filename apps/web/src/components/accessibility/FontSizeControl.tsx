"use client";

import { useAccessibility } from "@/contexts/accessibility-context";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "normal", label: "A-", ariaLabel: "Fonte normal", buttonFontSize: "12px" },
  { value: "large", label: "A", ariaLabel: "Fonte grande", buttonFontSize: "14px" },
  { value: "xlarge", label: "A+", ariaLabel: "Fonte extra grande", buttonFontSize: "16px" },
] as const;

export function FontSizeControl() {
  const { fontSize, setFontSize } = useAccessibility();

  return (
    <div
      className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5"
      role="group"
      aria-label="Controle de tamanho da fonte"
      title="Tamanho da fonte"
    >
      {OPTIONS.map((option) => {
        const active = fontSize === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.ariaLabel}
            title={option.ariaLabel}
            onClick={() => setFontSize(option.value)}
            className={cn(
              "h-7 min-w-8 rounded-md px-2 leading-none transition-colors",
              active
                ? "border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                : "border border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
            )}
            style={{ fontSize: option.buttonFontSize, fontWeight: 600 }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
