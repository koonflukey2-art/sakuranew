"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  TrendingUp,
  FileText,
  BarChart3,
  Target,
  GitBranch,
  Settings,
  Sun,
  Moon,
  Bot,
  MessageSquare,
  Users,
  Calendar,
  Box,
  Gift,
  Facebook,
  Receipt,
} from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { getRolePermissions, type UserRole } from "@/lib/rbac-core";

interface MenuItem {
  label: string;
  href: string;
  icon: any;
  permission?: keyof ReturnType<typeof getRolePermissions>;
  allowedRoles?: UserRole[];
}

interface MenuSection {
  section: string;
  items: MenuItem[];
  collapsible?: boolean;
}

const menuStructure: MenuSection[] = [
  {
    section: "ภาพรวม",
    items: [
      {
        label: "แดชบอร์ด",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "canAccessDashboard",
      },
    ],
  },
  {
    section: "จัดการสต๊อกสินค้า",
    collapsible: true,
    items: [
      {
        label: "สต็อกสินค้า",
        href: "/stock",
        icon: Package,
        permission: "canAccessStock",
      },
      {
        label: "คำสั่งซื้อ",
        href: "/orders",
        icon: ShoppingCart,
        permission: "canAccessStock",
      },
      {
        label: "สรุปยอดรายวัน",
        href: "/daily-summary",
        icon: Calendar,
        permission: "canAccessReports",
      },
      {
        label: "จัดการสินค้า",
        href: "/products",
        icon: Box,
        permission: "canAccessStock",
      },
      {
        label: "โปรโมชั่น",
        href: "/promotions",
        icon: Gift,
        permission: "canAccessStock",
      },
    ],
  },
  {
    section: "การเงิน",
    collapsible: true,
    items: [
      {
        label: "งบประมาณ",
        href: "/capital-budget",
        icon: Wallet,
        permission: "canAccessBudget",
      },
      {
        label: "กำไร",
        href: "/profit",
        icon: TrendingUp,
        permission: "canAccessProfit",
      },
      {
        label: "คำขอเบิกงบ",
        href: "/budget-requests",
        icon: FileText,
        permission: "canAccessBudgetRequests",
      },
    ],
  },
  {
    section: "การวิเคราะห์",
    collapsible: true,
    items: [
      {
        label: "ต้นทุนและกำไร",
        href: "/analysis",
        icon: BarChart3,
        permission: "canAccessAnalytics",
      },
      {
        label: "KPI Dashboard",
        href: "/kpi",
        icon: Target,
        permission: "canAccessMetrics",
      },
      {
        label: "Work Flow",
        href: "/workflow",
        icon: GitBranch,
        permission: "canAccessWorkflows",
      },
    ],
  },
  {
    section: "โฆษณา",
    collapsible: true,
    items: [
      {
        label: "Ads Facebook",
        href: "/ads-facebook",
        icon: Facebook,
        permission: "canAccessAds",
      },
      {
        label: "อัพโหลดสลิป",
        href: "/upload-receipt",
        icon: Receipt,
        permission: "canAccessAds",
      },
    ],
  },
  {
    section: "AI",
    collapsible: true,
    items: [
      {
        label: "AI Chat",
        href: "/ai-chat",
        icon: MessageSquare,
        permission: "canAccessAI",
        allowedRoles: ["ADMIN", "STOCK"],
      },
      {
        label: "AI Dashboard",
        href: "/ai-dashboard",
        icon: Bot,
        permission: "canAccessAI",
        allowedRoles: ["ADMIN"],
      },
    ],
  },
  {
    section: "ผู้ใช้งาน",
    items: [
      {
        label: "จัดการผู้ใช้",
        href: "/users",
        icon: Users,
        permission: "canAccessUsers",
      },
    ],
  },
  {
    section: "ตั้งค่า",
    items: [
      {
        label: "System Settings",
        href: "/system-settings",
        icon: Settings,
        permission: "canAccessSettings",
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const sidebarStorageKey = "sidebar-expanded";
  const role = (session?.user?.role as UserRole) || "EMPLOYEE";
  const permissions = useMemo(() => getRolePermissions(role), [role]);
  const isDrawerExpanded = isMobileMenuOpen ? true : isExpanded;

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem(sidebarStorageKey);
    if (saved === "true") {
      setIsExpanded(true);
    }
  }, [sidebarStorageKey]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isMobileMenuOpen]);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem(sidebarStorageKey, String(newState));
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg text-white hover:bg-white/10 light:bg-white light:text-black light:border-black/20 shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-black/95 backdrop-blur-xl border-r border-white/10 z-40 transition-all duration-300 ease-in-out overflow-y-auto light:bg-white light:border-black/10",
          // Width
          isDrawerExpanded ? "w-64" : "w-20",
          // Mobile behavior
          "lg:translate-x-0",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4">
          {/* Logo + Collapse Button */}
          <div className="flex items-center justify-between mb-8">
            {isDrawerExpanded && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <span className="text-2xl">🌸</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    Sakura Biotech
                  </h1>
                  <p className="text-xs text-gray-400 light:text-gray-600">
                    Co. Ltd
                  </p>
                </div>
              </div>
            )}
            {!isDrawerExpanded && (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto">
                <span className="text-2xl">🌸</span>
              </div>
            )}
            <button
              onClick={toggleExpanded}
              className="hidden lg:block p-1.5 hover:bg-white/10 rounded-lg transition-colors light:hover:bg-black/5"
            >
              {isExpanded ? (
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full mb-6 p-3 rounded-lg flex items-center gap-3 transition-colors",
              "bg-white/5 hover:bg-white/10 light:bg-black/5 light:hover:bg-black/10",
              !isDrawerExpanded && "justify-center"
            )}
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-blue-500" />
            )}
            {isDrawerExpanded && (
              <span className="text-sm text-white light:text-black">
                {theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}
              </span>
            )}
          </button>

          {/* Menu */}
          <nav className="space-y-6">
            {menuStructure.map((section) => {
              const isCollapsed = collapsedSections.has(section.section);
              const visibleItems = section.items.filter((item) => {
                const allowedByPermission = item.permission
                  ? permissions[item.permission]
                  : true;
                const allowedByRole = item.allowedRoles
                  ? item.allowedRoles.includes(role)
                  : true;
                return allowedByPermission && allowedByRole;
              });

              if (visibleItems.length === 0) {
                return null;
              }

              return (
                <div key={section.section}>
                  {isDrawerExpanded && (
                    <div className="flex items-center justify-between mb-2 px-3">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase light:text-gray-600">
                        {section.section}
                      </h3>
                      {section.collapsible && (
                        <button
                          onClick={() => toggleSection(section.section)}
                          className="p-1 hover:bg-white/10 rounded light:hover:bg-black/10"
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {(!section.collapsible || !isCollapsed || !isDrawerExpanded) && (
                    <div className="space-y-1">
                      {visibleItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                            !isDrawerExpanded && "justify-center",
                            pathname === item.href
                              ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/30 light:from-purple-100 light:to-pink-100 light:text-black light:border-purple-300"
                              : "text-gray-400 hover:text-white hover:bg-white/5 light:text-gray-600 light:hover:text-black light:hover:bg-black/5"
                          )}
                          title={!isDrawerExpanded ? item.label : undefined}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {isDrawerExpanded && (
                            <span className="text-sm font-medium">
                              {item.label}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
