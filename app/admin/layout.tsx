import type { ReactNode } from "react";
import { requireContentManager } from "@/lib/rbac";
import { logoutAction } from "@/app/actions/auth";
import { Wordmark } from "@/components/brand";
import { Badge } from "@/components/ui";
import { AdminNav, AdminBreadcrumbs, type NavLink } from "@/app/admin/admin-nav";

const NAV_LINKS: NavLink[] = [
  { href: "/admin", label: "Огляд" },
  { href: "/admin/questions", label: "Питання" },
  { href: "/admin/categories", label: "Категорії" },
  { href: "/admin/topics", label: "Теми" },
  { href: "/admin/content-versions", label: "Версії контенту" },
  { href: "/admin/analytics", label: "Аналітика" },
  { href: "/admin/content-health", label: "Якість контенту" },
  { href: "/admin/readiness-shadow", label: "Готовність (тінь)" },
  { href: "/admin/calibration", label: "Калібрування" },
  { href: "/admin/learning-health", label: "Здоровʼя навчання" },
  { href: "/admin/entitlements", label: "Доступи" },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Адміністратор",
  CONTENT_MANAGER: "Контент-менеджер",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Server-side gate for EVERY admin route. Redirects non-content-managers.
  const user = await requireContentManager();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Wordmark href="/admin" />
              <Badge tone="sign">Адмінпанель</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted sm:inline">
                {user.name} · {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-field"
                >
                  Вийти
                </button>
              </form>
            </div>
          </div>
          <AdminNav links={NAV_LINKS} />
        </div>
      </header>
      <div className="border-b border-line bg-field/50">
        <div className="mx-auto w-full max-w-5xl px-5 py-2">
          <AdminBreadcrumbs links={NAV_LINKS} />
        </div>
      </div>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">{children}</main>
    </div>
  );
}
