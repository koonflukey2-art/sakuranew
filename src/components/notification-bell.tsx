"use client";

import { useState } from "react";
import { Bell, Package, Megaphone, Wallet, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "LOW_STOCK" | "BUDGET_REQUEST" | "CAMPAIGN_COMPLETE" | "AI_ALERT";
  message: string;
  isRead: boolean;
}

const mockNotifications: Notification[] = [
  { id: "1", type: "LOW_STOCK", message: 'สินค้า "แป้งฝุ่น Pond\'s" ใกล้หมดสต็อก', isRead: false },
  { id: "2", type: "CAMPAIGN_COMPLETE", message: 'แคมเปญ "Flash Sale" สิ้นสุดแล้ว ROI: 1.8x', isRead: false },
  { id: "3", type: "AI_ALERT", message: "AI แนะนำ: เพิ่มงบโฆษณา TikTok 20%", isRead: false },
];

const iconMap = { LOW_STOCK: Package, BUDGET_REQUEST: Wallet, CAMPAIGN_COMPLETE: Megaphone, AI_ALERT: Bot };
const colorMap = { LOW_STOCK: "text-orange-500 bg-orange-500/10", BUDGET_REQUEST: "text-blue-500 bg-blue-500/10", CAMPAIGN_COMPLETE: "text-green-500 bg-green-500/10", AI_ALERT: "text-purple-500 bg-purple-500/10" };

export function NotificationBell() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h4 className="font-semibold">การแจ้งเตือน</h4>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((notification) => {
            const Icon = iconMap[notification.type];
            return (
              <div
                key={notification.id}
                className={cn("flex items-start gap-3 p-3 border-b cursor-pointer hover:bg-muted/50", !notification.isRead && "bg-muted/30")}
                onClick={() => markAsRead(notification.id)}
              >
                <div className={cn("p-2 rounded-full", colorMap[notification.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm flex-1">{notification.message}</p>
                {!notification.isRead && <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
