"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser, SignOutButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
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
  Bot,
  BarChart3,
  LogOut,
  Menu,
  X,
  FileText,
  Sparkles,
} from "lucide-react";

type UserRole = "ADMIN" | "STOCK" | "EMPLOYEE";

// Updated nav items based on RBAC requirements
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, color: "text-cyan-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/stock", label: "จัดการสินค้า", icon: Package, color: "text-purple-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/budget-requests", label: "Budget Requests", icon: FileText, color: "text-amber-500", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/analytics", label: "การวิเคราะห์", icon: BarChart3, badge: "New", color: "text-violet-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/ai-chat", label: "AI Chat", icon: Bot, badge: "New", color: "text-emerald-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot, badge: "AI", color: "text-blue-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/ai-dashboard", label: "AI Dashboard", icon: Sparkles, badge: "New", color: "text-purple-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },
  { href: "/notifications", label: "การแจ้งเตือน", icon: Bell, color: "text-red-400", roles: ["ADMIN", "STOCK", "EMPLOYEE"] },

  // STOCK and ADMIN only pages
  { href: "/ads", label: "โฆษณา", icon: Megaphone, color: "text-pink-400", roles: ["ADMIN", "STOCK"] },
  { href: "/budget", label: "งบประมาณ", icon: Wallet, color: "text-amber-400", roles: ["ADMIN", "STOCK"] },
  { href: "/reports", label: "รายงาน", icon: FileBarChart, color: "text-blue-400", roles: ["ADMIN", "STOCK"] },
  { href: "/profit", label: "คำนวณกำไร", icon: Calculator, color: "text-green-400", roles: ["ADMIN", "STOCK"] },

  // ADMIN only pages
  { href: "/automation", label: "กฎอัตโนมัติ", icon: Zap, badge: "New", color: "text-yellow-400", roles: ["ADMIN"] },
  { href: "/workflows", label: "n8n Workflow", icon: GitBranch, badge: "Beta", color: "text-indigo-400", roles: ["ADMIN"] },
  { href: "/metrics", label: "แผน Metrics", icon: Target, badge: "New", color: "text-orange-400", roles: ["ADMIN"] },
  { href: "/users", label: "ผู้ใช้งาน", icon: Users, color: "text-teal-400", roles: ["ADMIN"] },
  { href: "/settings", label: "ตั้งค่า", icon: Settings, color: "text-muted-foreground", roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const visibleNavItems = userRole
    ? navItems.filter((item) => item.roles.includes(userRole))
    : navItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200
        flex flex-col overflow-hidden shadow-lg
        transform transition-transform duration-200 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
      {/* Logo Section - Clear */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Store className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Sakura
            </h1>
            <p className="text-xs text-gray-500">E-Commerce AI</p>
          </div>
        </div>
      </div>

      {/* Navigation - Clear */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {visibleNavItems.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                pathname === item.href
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && (
                <Badge className="ml-auto bg-orange-500 text-white text-xs px-2 py-0.5 border-0">
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* User Section - Clear */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-10 h-10 ring-2 ring-pink-200",
              },
            }}
          />
          {user && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {user.fullName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.primaryEmailAddress?.emailAddress}
              </p>
              {userRole && (
                <Badge className="mt-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-2 py-0.5 border-0">
                  {userRole === "ADMIN" && "แอดมิน"}
                  {userRole === "STOCK" && "พนักงานสต๊อก"}
                  {userRole === "EMPLOYEE" && "พนักงาน"}
                </Badge>
              )}
            </div>
          )}
        </div>

        <SignOutButton>
          <Button
            variant="ghost"
            className="w-full justify-start mt-2 text-gray-600 hover:text-red-500 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="text-sm">ออกจากระบบ</span>
          </Button>
        </SignOutButton>
      </div>

      {/* Footer - Clear */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Powered by AI</span>
          <span className="font-semibold text-pink-500">
            Gemini 2.0
          </span>
        </div>
      </div>
    </aside>

      {/* Mobile Menu Button - Bottom-Left (to avoid AI Assistant overlap) */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed bottom-20 left-4 lg:hidden z-40 bg-gradient-to-r from-pink-500 to-purple-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95"
        aria-label={isMobileOpen ? "Close menu" : "Open menu"}
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
    </>
  );
}
