import { redirect } from "next/navigation";
import { hasValidSession } from "@/server/auth-guard";
import { AdminTabs } from "@/backoffice/AdminTabs";
import { ScreensBanner } from "@/backoffice/ScreensBanner";
import "@/styles/admin.css";

export const dynamic = "force-dynamic";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasValidSession())) {
    redirect("/backoffice/login");
  }
  return (
    <div className="ad-root">
      <main className="ad-main">
        <ScreensBanner />
        {children}
      </main>
      <AdminTabs />
    </div>
  );
}
