"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRolePermissions, type UserRole } from "@/lib/rbac-core";
import { menuStructure } from "@/components/sidebar";

export function DashboardTopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user?.role as UserRole) || "EMPLOYEE";
  const permissions = useMemo(() => getRolePermissions(role), [role]);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const sections = useMemo(
    () =>
      menuStructure
        .map((section) => {
          const items = section.items.filter((item) => {
            const allowedByPermission = item.permission
              ? permissions[item.permission]
              : true;
            const allowedByRole = item.allowedRoles
              ? item.allowedRoles.includes(role)
              : true;
            return allowedByPermission && allowedByRole;
          });
          return { ...section, items };
        })
        .filter((section) => section.items.length > 0),
    [permissions, role]
  );

  useEffect(() => {
    setOpenSection(null);
    setMobileOpen(false);
  }, [pathname]);

  const renderItems = (items: typeof sections[number]["items"]) => (
    <div className="grid gap-1">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              active
                ? "border border-purple-400/40 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white shadow-[0_0_16px_rgba(168,85,247,0.3)] light:text-black"
                : "text-gray-300 hover:bg-white/10 hover:text-white light:text-gray-700 light:hover:bg-black/5 light:hover:text-black"
            )}
          >
            <item.icon
              className={cn(
                "h-4 w-4 transition-colors",
                active
                  ? "text-purple-200 light:text-purple-600"
                  : "text-gray-400 group-hover:text-purple-200 light:text-gray-500 light:group-hover:text-purple-600"
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 transition hover:border-purple-400/40 hover:bg-white/10 light:border-black/10 light:bg-black/5 light:text-gray-800"
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          เมนูหลัก
        </button>
      </div>

      <div className="hidden flex-wrap gap-2 md:flex">
        {sections.map((section) => {
          const hasActive = section.items.some((item) => isActive(item.href));
          const isOpen = openSection === section.section;
          return (
            <div
              key={section.section}
              className="relative"
              onMouseEnter={() => setOpenSection(section.section)}
              onMouseLeave={() => setOpenSection(null)}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenSection((prev) =>
                    prev === section.section ? null : section.section
                  )
                }
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  hasActive
                    ? "border-purple-400/60 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)]"
                    : "border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40 hover:bg-white/10 hover:text-white",
                  "light:border-black/10 light:bg-black/5 light:text-gray-800 light:hover:border-purple-300/60 light:hover:bg-black/10"
                )}
                aria-expanded={isOpen}
              >
                <span>{section.section}</span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    isOpen
                      ? "bg-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.7)]"
                      : "bg-gray-500/60"
                  )}
                />
              </button>

              <div
                className={cn(
                  "absolute left-0 top-full z-40 mt-3 min-w-[240px] rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.6)] backdrop-blur-xl transition-all duration-200",
                  "light:border-black/10 light:bg-white/90",
                  isOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-2 opacity-0"
                )}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 light:text-gray-500">
                  {section.section}
                </p>
                {renderItems(section.items)}
              </div>
            </div>
          );
        })}
      </div>

      {mobileOpen && (
        <div className="md:hidden rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.6)] backdrop-blur-xl light:border-black/10 light:bg-white/90">
          <div className="space-y-5">
            {sections.map((section) => (
              <div key={section.section}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 light:text-gray-500">
                  {section.section}
                </div>
                {renderItems(section.items)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
