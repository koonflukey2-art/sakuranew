"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Package, Megaphone, Wallet, Home, Bell } from "lucide-react";

const navItems = [
  { href: "/", label: "หน้าหลัก", icon: Home },
  { href: "/stock", label: "จัดการสินค้า", icon: Package },
  { href: "/ads", label: "โฆษณา", icon: Megaphone },
  { href: "/budget", label: "งบประมาณ", icon: Wallet },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                    pathname === item.href
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button className="relative p-2 rounded-full hover:bg-muted">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
