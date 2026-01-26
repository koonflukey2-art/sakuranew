"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Gift,
  BarChart3,
} from "lucide-react";

const shortcuts = [
  { label: "ภาพรวม", href: "/dashboard", icon: LayoutDashboard },
  { label: "จัดการสินค้า", href: "/products", icon: Package },
  { label: "คำสั่งซื้อ", href: "/orders", icon: ShoppingCart },
  { label: "การเงิน", href: "/capital-budget", icon: Wallet },
  { label: "โปรโมชั่น", href: "/promotions", icon: Gift },
  { label: "การวิเคราะห์", href: "/analysis", icon: BarChart3 },
];

export function DashboardTopNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // ✅ รอ session โหลดก่อน กันกระพริบ (optional)
  if (status === "loading") return null;

  // ✅ show เฉพาะ ADMIN เท่านั้น
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex flex-wrap gap-2">
      {shortcuts.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all " +
              (active
                ? "border-purple-400/60 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)]"
                : "border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40 hover:bg-white/10 hover:text-white")
            }
          >
            <item.icon
              className={
                "h-4 w-4 transition-colors " +
                (active
                  ? "text-purple-200"
                  : "text-gray-400 group-hover:text-purple-200")
              }
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
