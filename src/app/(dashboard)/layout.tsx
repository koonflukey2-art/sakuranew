import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { UserSync } from "@/components/user-sync";
import { NotificationBell } from "@/components/notification-bell";
import { AIChatDialog } from "@/components/ai-chat-dialog";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black">
      <UserSync />
      <Sidebar />
      <main className="flex-1 overflow-y-auto ml-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center justify-between px-8 py-4">
            <h2 className="text-xl font-bold text-white">
              E-Commerce Management
            </h2>
            <NotificationBell />
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
      <AIChatDialog />
      <Toaster />
    </div>
  );
}
