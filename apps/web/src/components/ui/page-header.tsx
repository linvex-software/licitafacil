import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  breadcrumb?: { label: string; href?: string }[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({
  breadcrumb,
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <div className="bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-700 py-8 px-8 mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-2 text-sm mb-2">
          {breadcrumb.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-900 dark:text-white font-medium">
                  {item.label}
                </span>
              )}
              {index < breadcrumb.length - 1 && (
                <span className="text-gray-400">/</span>
              )}
            </div>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between mt-2 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-base text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
