"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AccountMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast({
        title: "✅ ออกจากระบบสำเร็จ",
        description: "คุณได้ออกจากระบบเรียบร้อยแล้ว",
        className: "premium-card border-green-500/50 glow-green",
      });
      router.push("/sign-in");
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

  const userInitials =
    (user.firstName?.[0] || "U") + (user.lastName?.[0] || "");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition cursor-pointer">
          <Avatar className="w-10 h-10 border-2 border-purple-500 glow-purple">
            <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
            <AvatarFallback className="bg-gradient-purple text-white font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-white">
              {user.fullName || user.firstName || "User"}
            </p>
            <p className="text-xs text-gray-400">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 premium-card border-white/20"
        align="end"
      >
        <DropdownMenuLabel className="text-gray-300">
          บัญชีของฉัน
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
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
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
