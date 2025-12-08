"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  MessageSquare,
  Bot,
  Sparkles,
  Bell,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  Store,
  Wallet,
} from "lucide-react";

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

interface MenuCategory {
  name: string;
  icon: any;
  items: MenuItem[];
}

const menuStructure: (MenuItem | MenuCategory)[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "จัดการสินค้า",
    icon: Store,
    items: [
      { name: "สินค้า", href: "/stock", icon: Package },
      { name: "รายการออเดอร์", href: "/orders", icon: ShoppingCart, badge: "New" },
    ],
  },
  {
    name: "การเงิน",
    icon: Wallet,
    items: [
      { name: "งบประมาณสินค้า", href: "/capital-budget", icon: Wallet, badge: "New" },
      { name: "Budget Requests", href: "/budget-requests", icon: FileText },
    ],
  },
  {
    name: "การวิเคราะห์",
    href: "/analytics",
    icon: BarChart3,
    badge: "New",
  },
  {
    name: "AI Features",
    icon: Bot,
    items: [
      { name: "AI Chat", href: "/ai-chat", icon: MessageSquare, badge: "New" },
      { name: "AI Assistant", href: "/ai-assistant", icon: Bot, badge: "AI" },
      { name: "AI Dashboard", href: "/ai-dashboard", icon: Sparkles, badge: "New" },
    ],
  },
  {
    name: "การแจ้งเตือน",
    href: "/notifications",
    icon: Bell,
  },
  {
    name: "ผู้ใช้งาน",
    href: "/users",
    icon: Users,
  },
  {
    name: "ตั้งค่า",
    href: "/settings",
    icon: Settings,
  },
];

function isCategory(item: MenuItem | MenuCategory): item is MenuCategory {
  return "items" in item;
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "จัดการสินค้า",
    "AI Features",
  ]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass rounded-lg text-white hover-glow"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-gradient-dark border-r border-white/10 transition-all duration-300 z-40",
          collapsed ? "w-20" : "w-72",
          "lg:relative"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-2xl font-bold text-gradient-purple">Sakura</h2>
              <p className="text-xs text-gray-400">E-Commerce AI Platform</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex text-white hover:bg-white/10"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-80px)]">
          {menuStructure.map((item) => {
            if (isCategory(item)) {
              const Icon = item.icon;
              const isExpanded = expandedCategories.includes(item.name);

              return (
                <div key={item.name}>
                  <button
                    onClick={() => !collapsed && toggleCategory(item.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                      "text-gray-300 hover:bg-white/5 hover-glow",
                      collapsed && "justify-center"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className="w-5 h-5 text-purple-400" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left font-medium">{item.name}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </>
                    )}
                  </button>

                  {!collapsed && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-purple-500/30 pl-3">
                      {item.items.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isActive = pathname === subItem.href;

                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                              isActive
                                ? "bg-gradient-purple text-white glow-purple"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                            <SubIcon className="w-4 h-4" />
                            <span className="flex-1">{subItem.name}</span>
                            {subItem.badge && (
                              <span className="px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">{subItem.badge}</span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  isActive
                    ? "bg-gradient-purple text-white glow-purple"
                    : "text-gray-300 hover:text-white hover:bg-white/5 hover-glow",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon
                  className={cn("w-5 h-5", isActive ? "text-white" : "text-purple-400")}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">{item.badge}</span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 z-30 backdrop-blur-sm"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
