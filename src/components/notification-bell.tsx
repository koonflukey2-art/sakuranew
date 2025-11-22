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
  type: "LOW_STOCK" | "BUDGET_REQUEST" | "CAMPAIGN_COMPLETE" | "AI_ALERT";
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const notificationIcons = {
  LOW_STOCK: Package,
  BUDGET_REQUEST: Wallet,
  CAMPAIGN_COMPLETE: Megaphone,
  AI_ALERT: Bell,
};

const notificationColors = {
  LOW_STOCK: "text-orange-500",
  BUDGET_REQUEST: "text-blue-500",
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
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.slice(0, 5)); // Show only 5 most recent
      setUnreadCount(data.length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
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
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold">การแจ้งเตือน</h3>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              คุณมี {unreadCount} การแจ้งเตือนใหม่
            </p>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              ไม่มีการแจ้งเตือนใหม่
            </p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const color = notificationColors[notification.type];

              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => markAsReadAndNavigate(notification)}
                  className="cursor-pointer p-4 focus:bg-blue-50"
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`${color} mt-0.5`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(new Date(notification.createdAt))}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
            <div className="border-t p-2">
              <Button
                variant="ghost"
                className="w-full"
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
