"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Package,
  Megaphone,
  Wallet,
  FileBarChart,
  Calculator,
  Target,
  Zap,
  GitBranch,
  Users,
  Settings,
  Store,
  Bell,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stock", label: "จัดการสินค้า", icon: Package },
  { href: "/ads", label: "โฆษณา", icon: Megaphone },
  { href: "/budget", label: "งบประมาณ", icon: Wallet },
  { href: "/reports", label: "รายงาน", icon: FileBarChart },
  { href: "/profit", label: "คำนวณกำไร", icon: Calculator },
  { href: "/metrics", label: "แผน Metrics", icon: Target, badge: "New" },
  { href: "/automation", label: "กฎอัตโนมัติ", icon: Zap, badge: "New" },
  { href: "/workflows", label: "n8n Workflow", icon: GitBranch, badge: "Beta" },
  { href: "/notifications", label: "การแจ้งเตือน", icon: Bell },
  { href: "/users", label: "ผู้ใช้งาน", icon: Users },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-black border-r border-white/10 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">E-Commerce</h1>
            <p className="text-xs text-white/60">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all group",
                pathname === item.href
                  ? "bg-white/10 text-white shadow-lg shadow-emerald-500/10"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <Badge className="ml-auto bg-emerald-500 text-white text-xs px-2 py-0.5">
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10",
                userButtonPopoverCard: "bg-black border-white/10",
                userButtonPopoverActionButton: "hover:bg-white/5",
              },
            }}
          />
          {user && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.fullName}
              </p>
              <p className="text-xs text-white/60 truncate">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>Powered by AI</span>
          <span>Gemini 2.0 Flash</span>
        </div>
      </div>
    </aside>
  );
}