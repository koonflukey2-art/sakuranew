"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  role: string;
  name?: string;
  email?: string;
}

export function AccountMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { toast } = useToast();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch user role from database
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUserData(data);
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  const handleSignOut = async () => {
    setIsLoggingOut(true);

    try {
      await signOut();

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

  if (!user) return null;

  const userInitials = user.firstName?.[0] + (user.lastName?.[0] || "") || "U";

  // Role display mapping
  const roleDisplay: Record<string, { label: string; color: string }> = {
    ADMIN: { label: "ผู้ดูแลระบบ", color: "bg-red-500/80 text-white" },
    STOCK: { label: "เจ้าหน้าที่สต๊อก", color: "bg-blue-500/80 text-white" },
    EMPLOYEE: { label: "พนักงาน", color: "bg-green-500/80 text-white" },
  };

  const roleInfo = userData?.role ? roleDisplay[userData.role] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition cursor-pointer border border-transparent hover:border-purple-500/30">
          <Avatar className="w-10 h-10 border-2 border-purple-500 shadow-lg shadow-purple-500/20">
            <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-white flex items-center gap-2">
              {user.fullName || user.firstName || "User"}
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </p>
            {roleInfo && (
              <Badge className={`text-xs ${roleInfo.color} px-2 py-0 mt-0.5`}>
                {roleInfo.label}
              </Badge>
            )}
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 bg-gradient-to-br from-gray-900 to-black border border-white/20 shadow-xl"
        align="end"
      >
        <DropdownMenuLabel className="text-gray-300">
          <div className="flex flex-col space-y-2">
            <p className="text-base font-semibold text-white">
              {user.fullName || user.firstName || "User"}
            </p>
            <p className="text-xs text-gray-400 font-normal">
              {user.primaryEmailAddress?.emailAddress}
            </p>
            {roleInfo && (
              <Badge className={`text-xs ${roleInfo.color} w-fit`}>
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
  );
}
