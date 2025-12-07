"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus, Settings, AlertTriangle } from "lucide-react";

export default function CapitalBudgetPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [budget, setBudget] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [addForm, setAddForm] = useState({
    amount: 0,
    description: "",
  });

  const [thresholdForm, setThresholdForm] = useState({
    minThreshold: 5000,
  });

  // Check if user is ADMIN
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUserData(data);

          if (data.role !== "ADMIN") {
            toast({
              title: "❌ ไม่มีสิทธิ์เข้าถึง",
              description: "หน้านี้สำหรับ ADMIN เท่านั้น",
              variant: "destructive",
            });
            window.location.href = "/dashboard";
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Fetch budget
  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/capital-budget");
      if (res.ok) {
        const data = await res.json();
        setBudget(data);
        setThresholdForm({ minThreshold: data.minThreshold || 5000 });
      }
    } catch (error) {
      console.error("Failed to fetch budget:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async () => {
    try {
      const res = await fetch("/api/capital-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      if (res.ok) {
        toast({
          title: "✅ เพิ่มงบสำเร็จ",
          description: `เพิ่มงบประมาณ ฿${addForm.amount.toLocaleString()} เรียบร้อย`,
        });

        fetchBudget();
        setShowAddDialog(false);
        setShowConfirmDialog(false);
        setAddForm({ amount: 0, description: "" });
      } else {
        const error = await res.json();
        toast({
          title: "❌ ไม่สามารถเพิ่มงบได้",
          description: error.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มงบได้",
        variant: "destructive",
      });
    }
  };

  const handleUpdateThreshold = async () => {
    try {
      const res = await fetch("/api/capital-budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thresholdForm),
      });

      if (res.ok) {
        toast({
          title: "✅ อัพเดทสำเร็จ",
          description: "อัพเดทค่าขั้นต่ำเรียบร้อย",
        });

        fetchBudget();
        setShowSettingsDialog(false);
      }
    } catch (error) {
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพเดทได้",
        variant: "destructive",
      });
    }
  };

  if (!userData || userData.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="premium-card max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-gray-400">หน้านี้สำหรับ ADMIN เท่านั้น</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            จัดการงบประมาณสินค้า
          </h1>
          <p className="text-gray-400 mt-1">
            จัดการงบประมาณและทุนหมุนเวียนสำหรับซื้อสินค้า (สำหรับ ADMIN)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowSettingsDialog(true)}
            variant="outline"
            className="bg-white/5 border-white/20 text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            ตั้งค่า
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มงบ
          </Button>
        </div>
      </div>

      {/* Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="premium-card hover-glow border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              งบประมาณทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ฿{budget?.amount?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-400 mt-1">งบที่ได้รับทั้งหมด</p>
          </CardContent>
        </Card>

        <Card className="premium-card hover-glow border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300">งบคงเหลือ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              ฿{budget?.remaining?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {budget?.remaining && budget?.amount
                ? `${((budget.remaining / budget.amount) * 100).toFixed(1)}% ของงบทั้งหมด`
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`premium-card hover-glow border-l-4 ${
            budget?.remaining <= budget?.minThreshold
              ? "border-l-red-500 bg-red-500/10"
              : "border-l-yellow-500"
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              ขั้นต่ำที่กำหนด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                budget?.remaining <= budget?.minThreshold ? "text-red-400" : "text-yellow-400"
              }`}
            >
              ฿{budget?.minThreshold?.toLocaleString() || "5,000"}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {budget?.remaining <= budget?.minThreshold ? "⚠️ ต่ำกว่าขั้นต่ำ!" : "ปกติ"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Budget Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="premium-card border-white/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">เพิ่มงบประมาณ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">จำนวนเงิน (฿)</Label>
              <Input
                type="number"
                value={addForm.amount}
                onChange={(e) =>
                  setAddForm({ ...addForm, amount: parseFloat(e.target.value) || 0 })
                }
                className="bg-white/5 border-white/20 text-white"
                placeholder="10000"
              />
            </div>
            <div>
              <Label className="text-gray-300">หมายเหตุ (ไม่บังคับ)</Label>
              <Input
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                className="bg-white/5 border-white/20 text-white"
                placeholder="เช่น งบเดือนมกราคม"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setAddForm({ amount: 0, description: "" });
              }}
              className="flex-1 bg-white/5 border-white/20 text-white"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                if (addForm.amount > 0) {
                  setShowConfirmDialog(true);
                }
              }}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
              disabled={addForm.amount <= 0}
            >
              เพิ่มงบ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="premium-card border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              ยืนยันการเพิ่มงบประมาณ
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              คุณแน่ใจหรือไม่ที่จะเพิ่มงบประมาณ{" "}
              <span className="font-bold text-green-400">
                ฿{addForm.amount.toLocaleString()}
              </span>{" "}
              เข้าสู่ระบบ?
              <br />
              การดำเนินการนี้ไม่สามารถยกเลิกได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/20 text-white">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddBudget}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="premium-card border-white/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              ตั้งค่างบประมาณ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">งบขั้นต่ำที่ต้องเตือน (฿)</Label>
              <Input
                type="number"
                value={thresholdForm.minThreshold}
                onChange={(e) =>
                  setThresholdForm({
                    minThreshold: parseFloat(e.target.value) || 5000,
                  })
                }
                className="bg-white/5 border-white/20 text-white"
                placeholder="5000"
              />
              <p className="text-xs text-gray-400 mt-1">
                ระบบจะแจ้งเตือนเมื่องบคงเหลือต่ำกว่าจำนวนที่กำหนด
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(false)}
              className="flex-1 bg-white/5 border-white/20 text-white"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleUpdateThreshold}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
            >
              บันทึก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
