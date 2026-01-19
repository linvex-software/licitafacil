import { type ReactNode } from "react";

interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, children, className = "" }: SectionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="text-gray-700 dark:text-gray-300">{children}</div>
    </div>
  );
}

interface SectionItemProps {
  label: string;
  value: string | ReactNode;
  className?: string;
}

export function SectionItem({ label, value, className = "" }: SectionItemProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${className}`}>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}:</span>
      <span className="text-sm text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
