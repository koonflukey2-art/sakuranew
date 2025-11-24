"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Package,
  Megaphone,
  Wallet,
  Trash2,
  Check,
  CheckCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatRelativeTime } from "@/lib/utils";
import { TableSkeleton } from "@/components/loading-states";
import { ErrorState } from "@/components/empty-states";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Notification {
  id: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR" | string; // เผื่อ type แปลก ๆ จาก backend
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const notificationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  INFO: Bell,
  WARNING: Package,
  SUCCESS: Megaphone,
  ERROR: Wallet,
} as const;

const notificationColors: Record<string, string> = {
  INFO: "text-blue-500",
  WARNING: "text-yellow-500",
  SUCCESS: "text-green-500",
  ERROR: "text-red-500",
} as const;

export default function NotificationsPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] =
    useState<Notification | null>(null);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const url =
        filter === "unread"
          ? "/api/notifications?unreadOnly=true"
          : "/api/notifications";

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch notifications");

      const data = await res.json();
      setNotifications(data || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setError("ไม่สามารถโหลดการแจ้งเตือนได้");
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดการแจ้งเตือนได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("Failed to mark as read");

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตการแจ้งเตือนได้",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (!res.ok) throw new Error("Failed to mark all as read");

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast({
        title: "สำเร็จ",
        description: "ทำเครื่องหมายการแจ้งเตือนทั้งหมดว่าอ่านแล้ว",
      });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตการแจ้งเตือนได้",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async () => {
    if (!notificationToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch(
        `/api/notifications?id=${notificationToDelete.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to delete notification");

      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationToDelete.id)
      );

      toast({
        title: "ลบสำเร็จ",
        description: "ลบการแจ้งเตือนแล้ว",
      });

      setDeleteDialogOpen(false);
      setNotificationToDelete(null);
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบการแจ้งเตือนได้",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const openDeleteDialog = (notification: Notification) => {
    setNotificationToDelete(notification);
    setDeleteDialogOpen(true);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (error && !loading) {
    return <ErrorState message={error} onRetry={fetchNotifications} />;
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">การแจ้งเตือน</h1>
          <p className="text-sm text-muted-foreground">
            ติดตามข้อมูลสำคัญและการอัปเดต
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline" size="sm">
            <CheckCheck className="h-4 w-4 mr-2" />
            อ่านทั้งหมด ({unreadCount})
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            ทั้งหมด ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            ยังไม่ได้อ่าน ({unreadCount})
          </TabsTrigger>
        </TabsList>

        {/* ALL TAB */}
        <TabsContent value="all" className="space-y-4 mt-6">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : notifications.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">
                  ไม่มีการแจ้งเตือน
                </p>
                <p className="text-sm text-muted-foreground">
                  เมื่อมีการแจ้งเตือนใหม่ จะแสดงที่นี่
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => {
              const Icon =
                notificationIcons[notification.type] ?? Bell; // fallback icon
              const color =
                notificationColors[notification.type] ?? "text-primary";

              return (
                <Card
                  key={notification.id}
                  className={`transition-all hover:shadow-md cursor-pointer border ${
                    !notification.isRead
                      ? "bg-primary/5 border-primary/40"
                      : "bg-card border-border"
                  }`}
                >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`${color} mt-1`}>
                  <Icon className="h-6 w-6" />
                </div>
                      <div
                        className="flex-1"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <Badge
                              variant="outline"
                              className="ml-2 bg-amber-500/10 text-amber-500 border-amber-500/40"
                            >
                              ใหม่
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(notification.createdAt))}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(notification);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* UNREAD TAB */}
        <TabsContent value="unread" className="space-y-4 mt-6">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : notifications.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground">
                  คุณอ่านทุกอย่างแล้ว!
                </p>
                <p className="text-sm text-muted-foreground">
                  ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => {
              const Icon =
                notificationIcons[notification.type] ?? Bell; // fallback icon
              const color =
                notificationColors[notification.type] ?? "text-primary";

              return (
                <Card
                  key={notification.id}
                  className="bg-primary/5 border-primary/40 transition-all hover:shadow-md cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`${color} mt-1`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div
                        className="flex-1"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="ml-2 bg-amber-500/10 text-amber-500 border-amber-500/40"
                          >
                            ใหม่
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(notification.createdAt))}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(notification);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="ยืนยันการลบ"
        description={
          notificationToDelete
            ? `คุณแน่ใจหรือไม่ที่จะลบการแจ้งเตือน "${notificationToDelete.title}"?`
            : "คุณแน่ใจหรือไม่ที่จะลบการแจ้งเตือนนี้?"
        }
        onConfirm={deleteNotification}
        confirmText="ลบ"
        cancelText="ยกเลิก"
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
