"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

type UserRole = "ADMIN" | "STOCK" | "EMPLOYEE";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export function AccountMenu() {
  const { user } = useUser();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/me");
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      ADMIN: { label: "แอดมิน", className: "bg-gradient-to-r from-red-500 to-pink-500" },
      STOCK: { label: "พนักงานสต๊อก", className: "bg-gradient-to-r from-blue-500 to-cyan-500" },
      EMPLOYEE: { label: "พนักงาน", className: "bg-gradient-to-r from-green-500 to-emerald-500" },
    };

    const config = roleConfig[role];
    return (
      <Badge className={`${config.className} text-white border-0 text-xs px-2 py-0.5`}>
        {config.label}
      </Badge>
    );
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = () => {
    toast.success("ออกจากระบบสำเร็จ", {
      description: "กำลังนำคุณกลับไปยังหน้าเข้าสู่ระบบ...",
      duration: 2000,
    });

    // Delay redirect to show toast
    setTimeout(() => {
      router.push("/");
    }, 500);
  };

  if (!user || isLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse"></div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center gap-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all hover:scale-105">
          <Avatar className="h-10 w-10 ring-2 ring-purple-500/50 hover:ring-purple-400 transition-all">
            <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white font-semibold">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 bg-slate-800 border-slate-700 text-white"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-purple-400" />
              <p className="text-sm font-medium leading-none text-white">
                {user.fullName || "ผู้ใช้งาน"}
              </p>
            </div>
            <p className="text-xs leading-none text-slate-400">
              {user.primaryEmailAddress?.emailAddress}
            </p>
            {userData?.role && (
              <div className="pt-1">
                {getRoleBadge(userData.role)}
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-slate-700" />

        <SignOutButton>
          <DropdownMenuItem
            className="text-red-400 focus:text-red-300 focus:bg-red-950/50 cursor-pointer"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>ออกจากระบบ</span>
          </DropdownMenuItem>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
