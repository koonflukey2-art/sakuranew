"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wallet, TrendingUp, PieChart, MoreVertical, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Budget {
  id: string;
  purpose: string;
  amount: number;
  spent: number;
  startDate: string | Date;
  endDate: string | Date;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function BudgetPage() {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUpdateSpentOpen, setIsUpdateSpentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [updatingBudget, setUpdatingBudget] = useState<Budget | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  // Fetch budgets from API
  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/budgets");
      if (!response.ok) throw new Error("Failed to fetch budgets");
      const data = await response.json();
      setBudgets(data);
    } catch (error) {
      console.error("Failed to fetch budgets:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลงบประมาณได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  // Calculate statistics
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Add budget
  const handleAddBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdding(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      purpose: formData.get("purpose") as string,
      amount: parseFloat(formData.get("amount") as string),
      spent: parseFloat(formData.get("spent") as string) || 0,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
    };

    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create budget");
      }

      toast({
        title: "สำเร็จ!",
        description: "เพิ่มงบประมาณใหม่แล้ว",
      });

      // Reset form ก่อนปิด Dialog
      e.currentTarget.reset();

      // ปิด Dialog
      setIsAddOpen(false);

      // Refresh data
      fetchBudgets();
    } catch (error: any) {
      console.error("Add budget error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถเพิ่มงบประมาณได้",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  // Update spent
  const handleUpdateSpent = (budget: Budget) => {
    setUpdatingBudget(budget);
    setIsUpdateSpentOpen(true);
  };

  const handleUpdateSpentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!updatingBudget) return;

    setUpdating(true);
    const formData = new FormData(e.currentTarget);
    const spent = parseFloat(formData.get("spent") as string);

    try {
      const response = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: updatingBudget.id,
          purpose: updatingBudget.purpose,
          amount: updatingBudget.amount,
          spent: spent,
          startDate: updatingBudget.startDate,
          endDate: updatingBudget.endDate,
        }),
      });

      if (!response.ok) throw new Error("Failed to update spent");

      toast({
        title: "สำเร็จ!",
        description: "อัพเดทค่าใช้จ่ายแล้ว",
      });

      // Reset form ก่อนปิด Dialog
      e.currentTarget.reset();

      // ปิด Dialog
      setIsUpdateSpentOpen(false);
      setUpdatingBudget(null);

      // Refresh data
      fetchBudgets();
    } catch (error) {
      console.error("Update spent error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพเดทค่าใช้จ่ายได้",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Edit budget
  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBudget) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      id: selectedBudget.id,
      purpose: formData.get("purpose") as string,
      amount: parseFloat(formData.get("amount") as string),
      spent: parseFloat(formData.get("spent") as string),
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
    };

    try {
      const response = await fetch("/api/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update budget");

      toast({
        title: "สำเร็จ!",
        description: "แก้ไขงบประมาณแล้ว",
      });

      // Reset form ก่อนปิด Dialog
      e.currentTarget.reset();

      // ปิด Dialog
      setIsEditOpen(false);
      setSelectedBudget(null);

      // Refresh data
      fetchBudgets();
    } catch (error) {
      console.error("Update budget error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขงบประมาณได้",
        variant: "destructive",
      });
    }
  };

  // Delete budget
  const handleDelete = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedBudget) return;

    try {
      const response = await fetch(`/api/budgets?id=${selectedBudget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete budget");

      toast({
        title: "สำเร็จ!",
        description: "ลบงบประมาณแล้ว",
      });

      setIsDeleteOpen(false);
      setSelectedBudget(null);
      fetchBudgets();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบงบประมาณได้",
        variant: "destructive",
      });
    }
  };

  // Format currency
  const formatCurrency = (value: number) => `฿${value.toLocaleString()}`;

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Prepare chart data
  const pieChartData = budgets.map((budget) => ({
    name: budget.purpose,
    value: budget.amount,
  }));

  const barChartData = budgets.map((budget) => ({
    name: budget.purpose,
    จัดสรร: budget.amount,
    ใช้ไป: budget.spent,
    คงเหลือ: budget.amount - budget.spent,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">งบประมาณ</h1>
          <p className="text-muted-foreground">จัดการงบประมาณและติดตามกำไร</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          ตั้งงบประมาณใหม่
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">งบประมาณรวม</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {budgets.length} รายการ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ใช้ไปแล้ว</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <Progress value={percentUsed} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {percentUsed.toFixed(1)}% ของงบประมาณ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">คงเหลือ</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              remaining >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {formatCurrency(remaining)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {remaining >= 0 ? "ยังใช้ได้" : "เกินงบประมาณ"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">เฉลี่ยต่อรายการ</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {formatCurrency(budgets.length > 0 ? totalBudget / budgets.length : 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              งบประมาณเฉลี่ย
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Budget Form */}
      <Card>
        <CardHeader>
          <CardTitle>เพิ่มงบประมาณใหม่</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBudget} className="space-y-4">
            <div>
              <Label>วัตถุประสงค์ *</Label>
              <Input
                name="purpose"
                required
                placeholder="เช่น Facebook Ads - December"
              />
            </div>

            <div>
              <Label>จำนวนเงิน (฿) *</Label>
              <Input name="amount" type="number" step="0.01" min="0" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>วันเริ่ม *</Label>
                <Input name="startDate" type="date" required />
              </div>
              <div>
                <Label>วันสิ้นสุด *</Label>
                <Input name="endDate" type="date" required />
              </div>
            </div>

            <div>
              <Label>ใช้ไปแล้ว (฿)</Label>
              <Input name="spent" type="number" step="0.01" min="0" defaultValue={0} />
            </div>

            <Button type="submit" disabled={adding} className="w-full">
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังเพิ่ม...
                </>
              ) : (
                "เพิ่มงบประมาณ"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการงบประมาณ</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีงบประมาณ
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วัตถุประสงค์</TableHead>
                  <TableHead>จัดสรร</TableHead>
                  <TableHead>ใช้ไป</TableHead>
                  <TableHead>คงเหลือ</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>ระยะเวลา</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((budget) => {
                  const remaining = budget.amount - budget.spent;
                  const percentage = (budget.spent / budget.amount) * 100;

                  return (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">{budget.purpose}</TableCell>
                      <TableCell>{formatCurrency(budget.amount)}</TableCell>
                      <TableCell>{formatCurrency(budget.spent)}</TableCell>
                      <TableCell>
                        <span
                          className={remaining < 0 ? "text-red-500" : "text-green-500"}
                        >
                          {formatCurrency(remaining)}
                        </span>
                      </TableCell>
                      <TableCell className="w-48">
                        <div className="space-y-1">
                          <Progress
                            value={percentage}
                            className={cn(
                              "h-2",
                              percentage > 90 && "[&>div]:bg-red-500",
                              percentage > 70 &&
                                percentage <= 90 &&
                                "[&>div]:bg-yellow-500",
                              percentage <= 70 && "[&>div]:bg-green-500"
                            )}
                          />
                          <p className="text-xs text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleUpdateSpent(budget)}>
                              💵 อัพเดทค่าใช้จ่าย
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(budget)}>
                              ✏️ แก้ไข
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(budget)}
                              className="text-red-600"
                            >
                              🗑️ ลบ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>สัดส่วนงบประมาณ</CardTitle>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>งบประมาณ vs ใช้ไป</CardTitle>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="จัดสรร" fill="#8884d8" />
                  <Bar dataKey="ใช้ไป" fill="#82ca9d" />
                  <Bar dataKey="คงเหลือ" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Spent Dialog */}
      <Dialog open={isUpdateSpentOpen} onOpenChange={setIsUpdateSpentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>อัพเดทค่าใช้จ่าย</DialogTitle>
            <DialogDescription>{updatingBudget?.purpose}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSpentSubmit}>
            <div className="space-y-4">
              <div>
                <Label>งบประมาณ</Label>
                <Input
                  value={formatCurrency(updatingBudget?.amount || 0)}
                  disabled
                />
              </div>
              <div>
                <Label>ใช้ไปแล้ว (฿) *</Label>
                <Input
                  name="spent"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={updatingBudget?.spent}
                  required
                />
              </div>
              <div>
                <Label>คงเหลือ</Label>
                <Input
                  value={formatCurrency(
                    (updatingBudget?.amount || 0) - (updatingBudget?.spent || 0)
                  )}
                  disabled
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsUpdateSpentOpen(false);
                  setUpdatingBudget(null);
                }}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึก"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขงบประมาณ</DialogTitle>
            <DialogDescription>อัปเดตข้อมูลงบประมาณ</DialogDescription>
          </DialogHeader>
          {selectedBudget && (
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <Label>วัตถุประสงค์ *</Label>
                  <Input
                    name="purpose"
                    defaultValue={selectedBudget.purpose}
                    required
                  />
                </div>
                <div>
                  <Label>จำนวนเงิน (฿) *</Label>
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedBudget.amount}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>วันเริ่ม *</Label>
                    <Input
                      name="startDate"
                      type="date"
                      defaultValue={
                        new Date(selectedBudget.startDate)
                          .toISOString()
                          .split("T")[0]
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label>วันสิ้นสุด *</Label>
                    <Input
                      name="endDate"
                      type="date"
                      defaultValue={
                        new Date(selectedBudget.endDate).toISOString().split("T")[0]
                      }
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>ใช้ไปแล้ว (฿)</Label>
                  <Input
                    name="spent"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedBudget.spent}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelectedBudget(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึก</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบงบประมาณ?</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบงบประมาณ &quot;{selectedBudget?.purpose}&quot; ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBudget(null)}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              ลบงบประมาณ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
