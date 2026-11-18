"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/backoffice/photos", label: "Photos", ico: "🖼" },
  { href: "/backoffice/rooms", label: "Rooms", ico: "🛏" },
  { href: "/backoffice/reviews", label: "Reviews", ico: "★" },
  { href: "/backoffice/messages", label: "Messages", ico: "✉" },
  { href: "/backoffice/settings", label: "Settings", ico: "⚙" },
  { href: "/backoffice/screens", label: "Screens", ico: "📺" },
];

/** Fixed bottom tab bar — the phone-first nav (plan UX baseline). */
export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="ad-tabs" aria-label="Back office sections">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`ad-tab ${pathname.startsWith(t.href) ? "active" : ""}`}
        >
          <span className="ico" aria-hidden>
            {t.ico}
          </span>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
