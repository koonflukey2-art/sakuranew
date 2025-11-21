"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Shield, Trash2 } from "lucide-react";

const mockUsers = [
  { id: "1", email: "admin@test.com", name: "Admin User", role: "ADMIN", createdAt: "2024-01-15", lastLogin: "2024-11-21 10:30" },
  { id: "2", email: "staff1@test.com", name: "พนักงานสต็อก 1", role: "STOCK_STAFF", createdAt: "2024-03-20", lastLogin: "2024-11-21 09:15" },
  { id: "3", email: "user1@test.com", name: "ผู้ใช้ทั่วไป 1", role: "USER", createdAt: "2024-05-10", lastLogin: "2024-11-20 14:45" },
  { id: "4", email: "user2@test.com", name: "ผู้ใช้ทั่วไป 2", role: "USER", createdAt: "2024-06-25", lastLogin: "2024-11-19 16:20" },
];

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-500",
  STOCK_STAFF: "bg-blue-500",
  USER: "bg-gray-500",
};

const roleLabels: Record<string, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  STOCK_STAFF: "พนักงานสต็อก",
  USER: "ผู้ใช้ทั่วไป",
};

export default function UsersPage() {
  const [users, setUsers] = useState(mockUsers);

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  };

  const handleDelete = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-muted-foreground">สำหรับผู้ดูแลระบบเท่านั้น</p>
        </div>
        <Badge variant="destructive" className="flex items-center gap-1">
          <Shield className="h-3 w-3" /> Admin Only
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">ผู้ใช้ทั้งหมด</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{users.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">พนักงานสต็อก</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{users.filter((u) => u.role === "STOCK_STAFF").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">ผู้ใช้ทั่วไป</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-600">{users.filter((u) => u.role === "USER").length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />รายชื่อผู้ใช้</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>ยศ</TableHead>
                <TableHead>วันที่สมัคร</TableHead>
                <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    {user.role === "ADMIN" ? (
                      <Badge className={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                    ) : (
                      <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">ผู้ใช้ทั่วไป</SelectItem>
                          <SelectItem value="STOCK_STAFF">พนักงานสต็อก</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>{user.createdAt}</TableCell>
                  <TableCell>{user.lastLogin}</TableCell>
                  <TableCell>
                    {user.role !== "ADMIN" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                            <AlertDialogDescription>คุณต้องการลบผู้ใช้ {user.email} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-red-500 hover:bg-red-600">ลบ</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
