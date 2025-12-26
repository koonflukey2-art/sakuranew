"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AccountMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Load persisted expanded state
  useEffect(() => {
    const saved = localStorage.getItem("account-menu-expanded");
    if (saved !== null) {
      setIsExpanded(saved === "true");
    }
  }, []);

  const handleSignOut = async () => {
    setIsLoggingOut(true);

    try {
      await signOut({ redirect: false });

      // Show beautiful logout notification
      toast({
        title: "✅ ออกจากระบบสำเร็จ",
        description: "คุณได้ออกจากระบบเรียบร้อยแล้ว",
        className: "bg-gradient-to-br from-gray-900 to-black border-green-500/50 text-white shadow-xl",
      });

      router.push("/");
    } catch (error) {
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const user = session?.user;
  if (!user) return null;

  const nameInitials =
    user.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || user.email?.[0] || "U";

  // Role display mapping
  const roleDisplay: Record<string, { label: string; color: string }> = {
    ADMIN: {
      label: "แอดมิน",
      color:
        "bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-100 border border-rose-500/30",
    },
    STOCK: {
      label: "พนักงานสต๊อก",
      color:
        "bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-100 border border-sky-500/30",
    },
    EMPLOYEE: {
      label: "พนักงาน",
      color:
        "bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-100 border border-emerald-500/30",
    },
  };

  const roleInfo = user.role ? roleDisplay[user.role] : null;

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem("account-menu-expanded", String(newState));
  };

  return (
    <div
      className={`menu-wrapper transition-all duration-300 ease-in-out border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm ${
        isExpanded ? "menu-expanded h-24" : "menu-collapsed h-14"
      }`}
    >
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpanded}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              ย่อ
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              ขยาย
            </>
          )}
        </Button>

        <div
          className={`flex items-center gap-4 transition-all duration-300 ${
            isExpanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
          }`}
        >
          {isExpanded && (
            <>
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-gray-400">
                  {user?.email}
                </p>
                {roleInfo && (
                  <Badge
                    className={`mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${roleInfo.color}`}
                  >
                    {roleInfo.label}
                  </Badge>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="w-11 h-11 border-2 border-purple-500 shadow-lg shadow-purple-500/20">
                      <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold">
                        {nameInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 bg-gradient-to-br from-gray-900 to-black border border-white/20 shadow-xl"
                  align="end"
                >
                  <DropdownMenuLabel className="text-gray-300">
                    <div className="flex flex-col space-y-2">
                      <p className="text-base font-semibold text-white">
                        {user.name || "User"}
                      </p>
                      <p className="text-xs text-gray-400 font-normal">
                        {user.email}
                      </p>
                      {roleInfo && (
                        <Badge
                          className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${roleInfo.color}`}
                        >
                          {roleInfo.label}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator className="bg-white/10" />

                  <DropdownMenuItem
                    className="text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer"
                    onClick={() => router.push("/user-profile")}
                  >
                    <User className="w-4 h-4 mr-2" />
                    โปรไฟล์
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer"
                    onClick={() => router.push("/settings")}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    ตั้งค่า
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/10" />

                  <DropdownMenuItem
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer font-medium"
                    onClick={handleSignOut}
                    disabled={isLoggingOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {isLoggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {!isExpanded && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <User className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
