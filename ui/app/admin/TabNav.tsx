"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", href: "/admin" },
  { label: "Components", href: "/admin/components" },
  { label: "Build", href: "/admin/build" },
  { label: "Brand", href: "/admin/brand" },
  { label: "Palette", href: "/admin/palette" },
  { label: "Concepts", href: "/admin/concepts" },
  { label: "Run", href: "/admin/run" },
];

export default function TabNav() {
  const pathname = usePathname();
  return (
    <div className="max-w-5xl mx-auto px-6">
      <nav className="flex -mb-px">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
                active
                  ? "border-indigo-600 text-indigo-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
