"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Shield,
  Package,
  Briefcase,
  Loader2,
  Crown,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "STOCK" | "EMPLOYEE";
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Authorization state
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<"ADMIN" | "STOCK" | "EMPLOYEE">(
    "EMPLOYEE"
  );
  const [updating, setUpdating] = useState(false);

  // Check authorization
  useEffect(() => {
    checkAccess();
  }, []);

  // Fetch users on mount
  useEffect(() => {
    if (isAuthorized) {
      fetchUsers();
    }
  }, [isAuthorized]);

  const checkAccess = async () => {
    try {
      const response = await fetch("/api/rbac/check-access");

      if (!response.ok) {
        console.error("Failed to check permissions");
        router.push("/");
        return;
      }

      const data = await response.json();

      if (!data.permissions.canAccessUsers) {
        console.warn("User does not have permission to access user management");
        toast({
          title: "ไม่มีสิทธิ์เข้าถึง",
          description: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
          variant: "destructive",
        });
        router.push("/");
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("RBAC check failed:", error);
      router.push("/");
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users");

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้ใช้งานได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);

      const response = await fetch("/api/users/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      toast({
        title: "✅ อัปเดตสำเร็จ",
        description: `เปลี่ยนสิทธิ์เป็น ${getRoleLabel(newRole)} แล้ว`,
      });

      setIsDialogOpen(false);
      fetchUsers(); // Refresh list
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถอัปเดตสิทธิ์ได้",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Crown className="w-4 h-4" />;
      case "STOCK":
        return <Package className="w-4 h-4" />;
      case "EMPLOYEE":
        return <Briefcase className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "ผู้ดูแลระบบ";
      case "STOCK":
        return "พนักงานสต๊อก";
      case "EMPLOYEE":
        return "พนักงาน";
      default:
        return "ไม่ระบุ";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-gradient-to-r from-yellow-500 to-orange-500";
      case "STOCK":
        return "bg-gradient-to-r from-blue-500 to-cyan-500";
      case "EMPLOYEE":
        return "bg-gradient-to-r from-gray-500 to-gray-600";
      default:
        return "bg-gray-500";
    }
  };

  // Loading state
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Not authorized
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-white">
            <Users className="w-8 h-8" />
            User Management
          </h1>
          <p className="text-gray-400 mt-1">
            จัดการผู้ใช้งานและสิทธิ์การเข้าถึงระบบ
          </p>
        </div>
        <Button onClick={fetchUsers} variant="outline" size="sm" className="border border-white/20 text-gray-100">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-medium">Admins</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {users.filter((u) => u.role === "ADMIN").length}
                </p>
              </div>
              <Crown className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Stock Staff</p>
                <p className="text-2xl font-bold text-blue-800">
                  {users.filter((u) => u.role === "STOCK").length}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">Employees</p>
                <p className="text-2xl font-bold text-gray-800">
                  {users.filter((u) => u.role === "EMPLOYEE").length}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-white/5 border border-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl text-white">All Users</CardTitle>
          <CardDescription className="text-gray-400">
            จำนวนผู้ใช้งานทั้งหมด: {users.length} คน
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-500" />
              <p>ไม่พบข้อมูลผู้ใช้งาน</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-4 text-left text-sm font-semibold text-gray-200">
                      Email
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200">
                      Name
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200">
                      Role
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200">
                      Created
                    </th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="p-4 text-white font-medium">
                        {user.email}
                      </td>
                      <td className="p-4 text-gray-200">
                        {user.name || "-"}
                      </td>
                      <td className="p-4">
                        <Badge
                          className={`${getRoleBadgeColor(
                            user.role
                          )} text-white flex items-center gap-1 w-fit`}
                        >
                          {getRoleIcon(user.role)}
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-300">
                        {new Date(user.createdAt).toLocaleDateString("th-TH")}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(user)}
                          className="border border-purple-300 text-purple-200 hover:bg-purple-950/40"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Change Role
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-950 border border-white/15 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Change User Role</DialogTitle>
            <DialogDescription className="text-gray-400">
              เปลี่ยนสิทธิ์การเข้าถึงระบบของผู้ใช้งาน
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <p className="text-sm text-gray-300">Email</p>
                <p className="font-semibold text-white">
                  {selectedUser.email}
                </p>
                {selectedUser.name && (
                  <>
                    <p className="text-sm text-gray-300 mt-2">Name</p>
                    <p className="font-semibold text-white">
                      {selectedUser.name}
                    </p>
                  </>
                )}
                <p className="text-sm text-gray-300 mt-2">Current Role</p>
                <Badge
                  className={`${getRoleBadgeColor(
                    selectedUser.role
                  )} text-white mt-1`}
                >
                  {getRoleLabel(selectedUser.role)}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-200 mb-2 block">
                  New Role
                </label>
                <Select
                  value={newRole}
                  onValueChange={(value: any) => setNewRole(value)}
                >
                  <SelectTrigger className="bg-white/5 border border-white/15 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border border-white/15">
                    <SelectItem
                      value="ADMIN"
                      className="font-semibold text-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        ผู้ดูแลระบบ (ADMIN)
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="STOCK"
                      className="font-semibold text-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-400" />
                        พนักงานสต๊อก (STOCK)
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="EMPLOYEE"
                      className="font-semibold text-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-300" />
                        พนักงาน (EMPLOYEE)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-950/40 border border-blue-500/50 p-3 rounded-lg">
                <p className="text-sm text-blue-100">
                  <strong>หมายเหตุ:</strong> การเปลี่ยนสิทธิ์จะมีผลทันที
                  ผู้ใช้งานอาจต้อง refresh หน้าเว็บ
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={updating}
              className="border border-white/20 text-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updating || newRole === selectedUser?.role}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            >
              {updating && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
