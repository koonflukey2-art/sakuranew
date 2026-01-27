"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

interface Expense {
  id: string;
  name: string;
  quantity: number;
  amount: number;
  note?: string | null;
  createdAt: string;
}

interface ExpenseSummary {
  total: number;
  used: number;
  remaining: number;
}

const emptySummary: ExpenseSummary = { total: 0, used: 0, remaining: 0 };

export default function ExpensesPage() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<ExpenseSummary>(emptySummary);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    quantity: "1",
    amount: "",
    note: "",
  });

  const formatCurrency = (value: number) => `฿${value.toLocaleString()}`;

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/expenses");
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to fetch expenses");
      }
      const data = await response.json();
      setSummary(data?.summary ?? emptySummary);
      setExpenses(Array.isArray(data?.expenses) ? data.expenses : []);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถโหลดข้อมูลค่าใช้จ่ายได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = formData.name.trim();
    const quantity = Number(formData.quantity);
    const amount = Number(formData.amount);
    const note = formData.note.trim();

    if (!name) {
      toast({
        title: "กรุณากรอกชื่อค่าใช้จ่าย",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast({
        title: "จำนวนต้องเป็นจำนวนเต็มมากกว่า 0",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "จำนวนเงินต้องมากกว่า 0",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          quantity,
          amount,
          note: note || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "ไม่สามารถบันทึกค่าใช้จ่ายได้");
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: "เพิ่มรายการค่าใช้จ่ายแล้ว",
      });

      setFormData({ name: "", quantity: "1", amount: "", note: "" });
      if (data?.summary) {
        setSummary(data.summary);
      }
      if (data?.expense) {
        setExpenses((prev) => [data.expense, ...prev]);
      } else {
        fetchExpenses();
      }
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถบันทึกค่าใช้จ่ายได้",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">ค่าใช้จ่าย</h1>
        <p className="text-muted-foreground">
          ติดตามการใช้จ่ายและตรวจสอบงบประมาณคงเหลือแบบเรียลไทม์
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">งบประมาณทั้งหมด</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total)}</div>
            <p className="text-xs text-muted-foreground">อ้างอิงจากงบประมาณที่ตั้งไว้</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ใช้ไปแล้ว</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.used)}</div>
            <p className="text-xs text-muted-foreground">รวมค่าใช้จ่ายทั้งหมด</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">งบคงเหลือ</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                summary.remaining >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {formatCurrency(summary.remaining)}
            </div>
            <p className="text-xs text-muted-foreground">ยอดคงเหลือจากงบทั้งหมด</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>เพิ่มรายการค่าใช้จ่าย</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-name">ชื่อค่าใช้จ่าย *</Label>
                <Input
                  id="expense-name"
                  placeholder="เช่น ค่าพัสดุ"
                  value={formData.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-quantity">จำนวน (ชิ้น) *</Label>
                <Input
                  id="expense-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.quantity}
                  onChange={(event) => handleChange("quantity", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-amount">จำนวนเงินรวม (บาท) *</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(event) => handleChange("amount", event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                จำนวนเงินรวมของรายการนี้ (ไม่ใช่ราคาต่อชิ้น)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-note">หมายเหตุ</Label>
              <Textarea
                id="expense-note"
                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                value={formData.note}
                onChange={(event) => handleChange("note", event.target.value)}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "กำลังบันทึก..." : "บันทึกค่าใช้จ่าย"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ประวัติรายการค่าใช้จ่าย</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีรายการค่าใช้จ่าย</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่/เวลา</TableHead>
                    <TableHead>ชื่อค่าใช้จ่าย</TableHead>
                    <TableHead className="text-right">จำนวน</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {new Date(expense.createdAt).toLocaleString("th-TH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{expense.name}</TableCell>
                      <TableCell className="text-right">{expense.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>{expense.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
