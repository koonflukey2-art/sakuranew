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
  { label: "วิเคราะห์", href: "/analysis", icon: BarChart3 },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 backdrop-blur-md light:bg-white/90 light:border-black/10">
      <div className="flex items-center justify-around px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {shortcuts.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex w-full flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors " +
                (active
                  ? "text-white light:text-black"
                  : "text-gray-400 hover:text-white light:text-gray-600 light:hover:text-black")
              }
            >
              <item.icon
                className={
                  "h-5 w-5 " +
                  (active ? "text-purple-200" : "text-gray-400")
                }
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
