"use client";

import { useEffect, useState } from "react";
import { Bell, Package, Megaphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils";

interface Notification {
  id: string;
  type:
    | "INFO"
    | "WARNING"
    | "SUCCESS"
    | "ERROR"
    | "BUDGET_APPROVED"
    | "BUDGET_ALERT"
    | "BUDGET_REQUEST"
    | "LOW_STOCK"
    | "CAMPAIGN_COMPLETE"
    | "AI_ALERT";
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const notificationIcons: Record<string, any> = {
  INFO: Bell,
  WARNING: Package,
  SUCCESS: Megaphone,
  ERROR: Bell,
  BUDGET_APPROVED: Wallet,
  BUDGET_ALERT: Wallet,
  BUDGET_REQUEST: Wallet,
  LOW_STOCK: Package,
  CAMPAIGN_COMPLETE: Megaphone,
  AI_ALERT: Bell,
};

const notificationColors: Record<string, string> = {
  INFO: "text-blue-500",
  WARNING: "text-orange-500",
  SUCCESS: "text-green-500",
  ERROR: "text-red-500",
  BUDGET_APPROVED: "text-green-500",
  BUDGET_ALERT: "text-amber-500",
  BUDGET_REQUEST: "text-blue-500",
  LOW_STOCK: "text-orange-500",
  CAMPAIGN_COMPLETE: "text-green-500",
  AI_ALERT: "text-purple-500",
};

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?unreadOnly=true");
      if (!res.ok) {
        console.error("Failed to fetch notifications: HTTP", res.status);
        // ไม่ให้ throw error แต่เซ็ต state เป็นค่าเริ่มต้น
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      const data = await res.json();
      setNotifications(data.slice(0, 5)); // Show only 5 most recent
      setUnreadCount(data.length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      // ไม่ให้ throw error
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsReadAndNavigate = async (notification: Notification) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id }),
      });

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Navigate if link exists
      if (notification.link) {
        router.push(notification.link);
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative bg-slate-800 text-slate-100 border-slate-600 hover:bg-slate-700 hover:text-white shadow-md"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 bg-slate-900 text-slate-50 border-slate-700 shadow-xl"
      >
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="font-semibold text-slate-50">การแจ้งเตือน</h3>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-200">
              คุณมี {unreadCount} การแจ้งเตือนใหม่
            </p>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-slate-200">
              ไม่มีการแจ้งเตือนใหม่
            </p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type] || Bell;
              const color = notificationColors[notification.type] || "text-gray-500";

              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => markAsReadAndNavigate(notification)}
                  className="cursor-pointer p-4 text-slate-50 hover:bg-slate-800 focus:bg-slate-800"
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`${color} mt-0.5`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        {formatRelativeTime(new Date(notification.createdAt))}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
            <div className="border-t border-slate-800 p-2 space-y-1">
              <Button
                variant="ghost"
                className="w-full text-sm text-slate-50 hover:bg-slate-800"
                onClick={markAllAsRead}
              >
                อ่านแล้วทั้งหมด
              </Button>
              <Button
                variant="ghost"
                className="w-full text-sm text-slate-50 hover:bg-slate-800"
                onClick={() => router.push("/notifications")}
              >
                ดูทั้งหมด
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
