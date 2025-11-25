"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Users,
  Shield,
  Trash2,
  MoreVertical,
  UserCog,
  Search,
  Filter,
  ShieldAlert,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { TableSkeleton } from "@/components/loading-states";
import { EmptyUsers } from "@/components/empty-states";

type UserRole = "ADMIN" | "STOCK" | "EMPLOYEE";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  lastLogin: string | null;
}

const roleColors: Record<UserRole, string> = {
  ADMIN: "bg-red-500",
  STOCK: "bg-blue-500",
  EMPLOYEE: "bg-gray-500",
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  STOCK: "พนักงานสต็อก",
  EMPLOYEE: "พนักงาน",
};

export default function UsersPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");

  // Role dialog
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole | "">("");

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/users");

      if (res.status === 401) {
        setError("กรุณาเข้าสู่ระบบใหม่");
        toast({
          title: "Session หมดอายุ",
          description: "กรุณาเข้าสู่ระบบใหม่อีกครั้ง",
          variant: "destructive",
        });
        setTimeout(() => router.push("/sign-in"), 2000);
        return;
      }

      if (res.status === 403) {
        setError("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        setUsers([]);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }

      const data: User[] = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUser.id, role: newRole }),
      });

      if (!res.ok) throw new Error("Failed to update role");

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, role: newRole } : u
        )
      );

      toast({
        title: "อัปเดตสำเร็จ",
        description: `เปลี่ยนบทบาทของ ${selectedUser.email} เป็น ${
          roleLabels[newRole]
        } แล้ว`,
      });

      setShowRoleDialog(false);
      setSelectedUser(null);
      setNewRole("");
    } catch (err) {
      console.error("Failed to update role:", err);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนบทบาทได้",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const res = await fetch(`/api/users?id=${userToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete user");

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));

      toast({
        title: "ลบสำเร็จ",
        description: `ลบผู้ใช้ ${userToDelete.email} แล้ว`,
      });

      setShowDeleteDialog(false);
      setUserToDelete(null);
    } catch (err) {
      console.error("Failed to delete user:", err);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบผู้ใช้ได้",
        variant: "destructive",
      });
    }
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleDialog(true);
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  // filters
  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      user.email.toLowerCase().includes(q) ||
      (user.name?.toLowerCase() || "").includes(q);

    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // stats
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const stockCount = users.filter((u) => u.role === "STOCK").length;
  const employeeCount = users.filter((u) => u.role === "EMPLOYEE").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-muted-foreground">สำหรับผู้ดูแลระบบเท่านั้น</p>
        </div>
        <Badge variant="destructive" className="flex items-center gap-1">
          <Shield className="h-3 w-3" /> Admin Only
        </Badge>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              ผู้ใช้ทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {adminCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              พนักงานสต็อก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stockCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ผู้ใช้ทั่วไป</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {employeeCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อหรืออีเมล..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value) =>
                setRoleFilter(value as UserRole | "ALL")
              }
            >
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="กรองตามบทบาท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="STOCK">พนักงานสต็อก</SelectItem>
                <SelectItem value="EMPLOYEE">พนักงาน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            รายชื่อผู้ใช้ ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <ShieldAlert className="h-16 w-16 text-red-500" />
              <p className="text-lg font-semibold text-slate-200">
                {error}
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyUsers />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
                  <TableHead>วันที่สร้าง</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || "ไม่ระบุชื่อ"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin
                        ? new Date(
                            user.lastLogin
                          ).toLocaleString("th-TH")
                        : "ยังไม่เคยเข้าสู่ระบบ"}
                    </TableCell>
                    <TableCell>
                      {new Date(
                        user.createdAt
                      ).toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.role !== "ADMIN" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openRoleDialog(user)}
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              เปลี่ยนบทบาท
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              ลบผู้ใช้
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เปลี่ยนบทบาทผู้ใช้</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ผู้ใช้</Label>
              <Input value={selectedUser?.email || ""} disabled />
            </div>
            <div>
              <Label>บทบาทใหม่</Label>
              <Select
                value={newRole}
                onValueChange={(value) => setNewRole(value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบทบาท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">พนักงาน</SelectItem>
                  <SelectItem value="STOCK">พนักงานสต็อก</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRoleDialog(false)}
              >
                ยกเลิก
              </Button>
              <Button onClick={handleRoleChange}>บันทึก</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้ใช้</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบผู้ใช้ {userToDelete?.email} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
