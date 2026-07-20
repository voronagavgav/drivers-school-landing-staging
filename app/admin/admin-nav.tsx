"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export interface NavLink {
  href: string;
  label: string;
}

/**
 * Returns true when `href` is the active section for the current pathname.
 * "/admin" (Огляд) matches ONLY its exact path; every other section also matches
 * its nested routes (e.g. /admin/questions/new highlights "Питання").
 */
export function isActiveSection(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Розділи адмінпанелі" className="-mx-1 flex flex-wrap gap-1">
      {links.map((link) => {
        const active = isActiveSection(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "bg-green-soft text-green-ink"
                : "text-ink hover:bg-field",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Breadcrumb trail derived from the active nav section + the pathname.
 * Always starts at "Адмінпанель" (→ /admin); on a section it appends that
 * section's label; on a nested route it appends a generic leaf crumb.
 */
export function AdminBreadcrumbs({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  const crumbs: { href?: string; label: string }[] = [
    { href: "/admin", label: "Адмінпанель" },
  ];

  if (pathname !== "/admin") {
    const section = links.find(
      (l) => l.href !== "/admin" && isActiveSection(pathname, l.href),
    );
    if (section) {
      const onSectionRoot = pathname === section.href;
      crumbs.push(
        onSectionRoot
          ? { label: section.label }
          : { href: section.href, label: section.label },
      );
      if (!onSectionRoot) {
        crumbs.push({ label: leafLabel(pathname) });
      }
    }
  }

  return (
    <nav aria-label="Хлібні крихти">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="font-medium text-green-deep hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className={last ? "font-semibold text-ink" : undefined} aria-current={last ? "page" : undefined}>
                  {c.label}
                </span>
              )}
              {!last && <span aria-hidden="true" className="text-line">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Human label for a nested-route leaf (e.g. .../new → "Створення", .../<id> → "Деталі"). */
function leafLabel(pathname: string): string {
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  if (last === "new") return "Створення";
  if (last === "edit") return "Редагування";
  return "Деталі";
}
