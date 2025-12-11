"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  Calendar as CalendarIcon,
  Loader2,
  RefreshCw,
  Download,
} from "lucide-react";

interface DailySummary {
  id: string;
  date: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalOrders: number;
  productsSold: Array<{
    productType: number | null;
    productName: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  cutOffTime: string;
}

export default function DailySummaryPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [timeRange, setTimeRange] = useState<"today" | "7days" | "30days">(
    "today"
  );
  const [selectedSummary, setSelectedSummary] = useState<DailySummary | null>(
    null
  );
  const [creatingCutoff, setCreatingCutoff] = useState(false);

  useEffect(() => {
    fetchSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, selectedDate]);

  const fetchSummaries = async () => {
    try {
      setLoading(true);

      let url = "/api/daily-cutoff?";

      if (timeRange === "today") {
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        url += `from=${start.toISOString()}&to=${end.toISOString()}`;
      } else if (timeRange === "7days") {
        url += "days=7";
      } else if (timeRange === "30days") {
        url += "days=30";
      }

      const response = await fetch(url, {
        method: "GET",
        credentials: "include", // เผื่อ cookie auth ไม่ถูกส่ง
      });

      if (!response.ok) {
        let msg = `Failed to fetch summaries (status ${response.status})`;
        try {
          const errBody = await response.json();
          if (errBody?.error || errBody?.message) {
            msg = errBody.error || errBody.message;
          }
        } catch (_) {}
        throw new Error(msg);
      }

      const raw = await response.json();

      // รองรับทั้ง [] และ { summaries: [] }
      const arr: DailySummary[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.summaries)
        ? raw.summaries
        : [];

      setSummaries(arr);

      if (arr.length > 0 && timeRange === "today") {
        setSelectedSummary(arr[0]);
      } else {
        setSelectedSummary(null);
      }
    } catch (error: any) {
      console.error("fetchSummaries error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description:
          error?.message || "ไม่สามารถโหลดข้อมูลสรุปยอดได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerCutOff = async () => {
    try {
      setCreatingCutoff(true);
      const response = await fetch("/api/daily-cutoff", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(
          error?.error || error?.message || "Failed to trigger cut-off"
        );
      }

      toast({
        title: "✅ สำเร็จ",
        description: "ตัดยอดรายวันเรียบร้อยแล้ว",
      });

      fetchSummaries();
    } catch (error: any) {
      console.error("triggerCutOff error:", error);
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: error?.message || "ไม่สามารถตัดยอดได้",
        variant: "destructive",
      });
    } finally {
      setCreatingCutoff(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Sakura Biotech - สรุปยอดรายวัน
          </h1>
          <p className="text-gray-400">
            ข้อมูลยอดขาย กำไร และสินค้าที่ขายแต่ละวัน
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchSummaries}
            variant="outline"
            className="border-purple-400 text-purple-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button
            onClick={triggerCutOff}
            disabled={creatingCutoff}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            {creatingCutoff ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังตัดยอด...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                ตัดยอดทันที
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <Card className="bg-white/5 border border-white/10 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center flex-wrap">
            <Select
              value={timeRange}
              onValueChange={(v: any) => setTimeRange(v)}
            >
              <SelectTrigger className="w-48 bg-white/5 border-white/20">
                <SelectValue placeholder="เลือกช่วงเวลา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">วันนี้</SelectItem>
                <SelectItem value="7days">7 วันล่าสุด</SelectItem>
                <SelectItem value="30days">30 วันล่าสุด</SelectItem>
              </SelectContent>
            </Select>

            {timeRange === "today" && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white/5 border-white/20"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards for Single Day */}
      {selectedSummary && timeRange === "today" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-300 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                รายได้
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                ฿{selectedSummary.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-900/30 to-red-950/30 border border-red-500/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                ต้นทุน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">
                ฿{selectedSummary.totalCost.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-500/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                กำไร
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">
                ฿{selectedSummary.totalProfit.toLocaleString()}
              </div>
              <p className="text-xs text-blue-200 mt-1">
                {selectedSummary.totalRevenue > 0
                  ? (
                      (selectedSummary.totalProfit /
                        selectedSummary.totalRevenue) *
                      100
                    ).toFixed(1)
                  : 0}
                % margin
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-500/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-300 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                ออเดอร์
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">
                {selectedSummary.totalOrders}
              </div>
              <p className="text-xs text-purple-200 mt-1">
                ฿
                {selectedSummary.totalOrders > 0
                  ? (
                      selectedSummary.totalRevenue /
                      selectedSummary.totalOrders
                    ).toLocaleString()
                  : 0}{" "}
                / ออเดอร์
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Breakdown for Single Day */}
      {selectedSummary && timeRange === "today" && (
        <Card className="bg-white/5 border border-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Package className="w-5 h-5" />
              รายละเอียดสินค้าที่ขาย
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSummary.productsSold &&
            selectedSummary.productsSold.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-300">สินค้า</TableHead>
                    <TableHead className="text-right text-gray-300">
                      จำนวน
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      รายได้
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      ต้นทุน
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      กำไร
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      % Margin
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSummary.productsSold.map((product, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-white">
                        {product.productName}
                      </TableCell>
                      <TableCell className="text-right text-white">
                        {product.quantity}
                      </TableCell>
                      <TableCell className="text-right text-green-400">
                        ฿{product.revenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-red-400">
                        ฿{product.cost.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-blue-400 font-bold">
                        ฿{product.profit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-gray-300">
                        {product.revenue > 0
                          ? ((product.profit / product.revenue) * 100).toFixed(
                              1
                            )
                          : 0}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-gray-400 py-8">
                ไม่มีข้อมูลการขายสินค้า
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multiple Days View */}
      {(timeRange === "7days" || timeRange === "30days") && (
        <Card className="bg-white/5 border border-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">สรุปยอดรายวัน</CardTitle>
          </CardHeader>
          <CardContent>
            {summaries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-300">วันที่</TableHead>
                    <TableHead className="text-right text-gray-300">
                      รายได้
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      ต้นทุน
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      กำไร
                    </TableHead>
                    <TableHead className="text-right text-gray-300">
                      ออเดอร์
                    </TableHead>
                    <TableHead className="text-right text-gray-300"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((summary) => (
                    <TableRow key={summary.id}>
                      <TableCell className="text-white">
                        {new Date(summary.date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right text-green-400">
                        ฿{summary.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-red-400">
                        ฿{summary.totalCost.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-blue-400 font-bold">
                        ฿{summary.totalProfit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-white">
                        {summary.totalOrders}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDate(
                              new Date(summary.date)
                                .toISOString()
                                .split("T")[0]
                            );
                            setTimeRange("today");
                          }}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          ดูรายละเอียด
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-gray-400 py-8">
                ไม่มีข้อมูลสรุปยอด
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Data (สำหรับกรณีไหน ๆ ที่ไม่มี summary เลย) */}
      {summaries.length === 0 && (
        <Card className="bg-white/5 border border-white/10 backdrop-blur">
          <CardContent className="py-12 text-center text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">ยังไม่มีข้อมูลสรุปยอดสำหรับช่วงเวลานี้</p>
            <p className="text-sm">
              กดปุ่ม "ตัดยอดทันที" เพื่อสร้างสรุปยอดวันนี้
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
