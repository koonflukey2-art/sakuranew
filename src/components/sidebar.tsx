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
  { href: "/", label: "Dashboard", icon: LayoutDashboard, color: "text-cyan-400" },
  { href: "/stock", label: "จัดการสินค้า", icon: Package, color: "text-purple-400" },
  { href: "/ads", label: "โฆษณา", icon: Megaphone, color: "text-pink-400" },
  { href: "/budget", label: "งบประมาณ", icon: Wallet, color: "text-amber-400" },
  { href: "/reports", label: "รายงาน", icon: FileBarChart, color: "text-blue-400" },
  { href: "/profit", label: "คำนวณกำไร", icon: Calculator, color: "text-green-400" },
  { href: "/metrics", label: "แผน Metrics", icon: Target, badge: "New", color: "text-orange-400" },
  { href: "/automation", label: "กฎอัตโนมัติ", icon: Zap, badge: "New", color: "text-yellow-400" },
  { href: "/workflows", label: "n8n Workflow", icon: GitBranch, badge: "Beta", color: "text-indigo-400" },
  { href: "/notifications", label: "การแจ้งเตือน", icon: Bell, color: "text-red-400" },
  { href: "/users", label: "ผู้ใช้งาน", icon: Users, color: "text-teal-400" },
  { href: "/settings", label: "ตั้งค่า", icon: Settings, color: "text-slate-400" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-r border-slate-700/50 flex flex-col overflow-hidden shadow-2xl">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 via-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/20">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">E-Commerce</h1>
            <p className="text-xs text-slate-400">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 group relative overflow-hidden",
                pathname === item.href
                  ? "bg-gradient-to-r from-slate-700/50 to-slate-800/50 text-white shadow-lg shadow-slate-900/20 ring-1 ring-slate-600/50"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", pathname === item.href ? item.color : "text-slate-400 group-hover:" + item.color)} />
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && (
                <Badge className="ml-auto bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs px-2 py-0.5 shadow-sm">
                  {item.badge}
                </Badge>
              )}
              {pathname === item.href && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-cyan-400 rounded-r-full" />
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10 ring-2 ring-emerald-400/30",
                userButtonPopoverCard: "bg-slate-900 border-slate-700",
                userButtonPopoverActionButton: "hover:bg-slate-800",
              },
            }}
          />
          {user && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-950/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Powered by AI</span>
          <span className="text-emerald-400 font-semibold">Gemini 2.0</span>
        </div>
      </div>
    </aside>
  );
}