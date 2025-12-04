"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  Trash2,
  TestTube2,
  Check,
  X,
  Facebook,
  Sparkles,
  RefreshCw,
  Globe2,
  KeyRound,
  // 👇 อันพวกนี้ต้องมีแน่ ๆ ตาม JSX ที่ใช้
  DollarSign,
  TrendingUp,
  Wallet,
  ShoppingCart,
  Activity,
  AlertTriangle,
  Bot,
} from "lucide-react";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------- helper types ----------

// ใช้ any ไว้ก่อนเพื่อไม่ให้ TS error ถ้า field จริงไม่ตรง
type Product = any;
type Campaign = any;
type Budget = any;

interface AIProvider {
  id: string;
  provider: string;
  modelName?: string;
  isActive: boolean;
  isDefault: boolean;
  isValid: boolean;
  lastTested?: string;
  hasApiKey: boolean;
}

interface PlatformCredential {
  id: string;
  platform: string;
  isValid: boolean;
  lastTested?: string | null;
  testMessage?: string | null;
}

interface AdAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId?: string | null;
  isActive: boolean;
  isValid: boolean;
  isDefault: boolean;
  lastTested?: string | null;
  testMessage?: string | null;
}

interface Stats {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  avgROAS: number;
}

interface OrderStats {
  today: { revenue: number; orders: number };
  week: { revenue: number; orders: number };
}

const DEFAULT_STATS: Stats = {
  totalRevenue: 0,
  totalProfit: 0,
  totalOrders: 0,
  avgROAS: 0,
};

const DEFAULT_ORDER_STATS: OrderStats = {
  today: { revenue: 0, orders: 0 },
  week: { revenue: 0, orders: 0 },
};

const COLORS = ["#ec4899", "#a855f7", "#06b6d4", "#f97316", "#22c55e", "#3b82f6"];

// ---------- helper functions ----------

function formatCurrency(value: number) {
  if (!value) return "฿0";
  return `฿${value.toLocaleString("th-TH", {
    maximumFractionDigits: 0,
  })}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("th-TH");
}

function calculateStats(
  products: Product[],
  campaigns: Campaign[],
  budgets: Budget[]
): Stats {
  // สมมติฟิลด์คร่าว ๆ – ถ้า backend มีชื่อไม่ตรงก็จะได้ 0 แต่ไม่ error
  const totalRevenue = (campaigns || []).reduce(
    (sum: number, c: any) => sum + (c.revenue ?? c.totalRevenue ?? 0),
    0
  );
  const totalSpent = (campaigns || []).reduce(
    (sum: number, c: any) => sum + (c.spend ?? c.totalSpent ?? c.cost ?? 0),
    0
  );
  const totalOrders = (campaigns || []).reduce(
    (sum: number, c: any) =>
      sum + (c.conversions ?? c.orders ?? c.totalOrders ?? 0),
    0
  );

  const totalProfit = totalRevenue - totalSpent;
  const avgROAS = totalSpent > 0 ? totalRevenue / totalSpent : 0;

  return {
    totalRevenue,
    totalProfit,
    totalOrders,
    avgROAS,
  };
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // access guard
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch("/api/rbac/check-access");

        if (!response.ok) {
          console.error("Failed to check permissions");
          router.push("/");
          return;
        }

        const data = await response.json();

        if (!data.permissions?.canAccessSettings) {
          console.warn("User does not have permission to access settings");
          router.push("/");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("RBAC check failed:", error);
        router.push("/");
      }
    };

    checkAccess();
  }, [router]);

  // ---------- states ----------

  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [orderStats, setOrderStats] = useState<OrderStats>(DEFAULT_ORDER_STATS);

  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [chartData, setChartData] = useState<any[]>([]);
  const [platformROIData, setPlatformROIData] = useState<any[]>([]);
  const [budgetChartData, setBudgetChartData] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<
    "GEMINI" | "OPENAI" | "N8N"
  >("GEMINI");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [platformCreds, setPlatformCreds] = useState<PlatformCredential[]>([]);
  const [loadingPlatformCreds, setLoadingPlatformCreds] = useState(true);
  const [testingPlatformId, setTestingPlatformId] = useState<string | null>(
    null
  );
  const [platformForm, setPlatformForm] = useState({
    platform: "FACEBOOK_ADS",
    apiKey: "",
    apiSecret: "",
    accessToken: "",
    refreshToken: "",
  });

  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loadingAdAccounts, setLoadingAdAccounts] = useState(true);
  const [testingAdAccount, setTestingAdAccount] = useState<string | null>(null);
  const [isAdAccountDialogOpen, setIsAdAccountDialogOpen] = useState(false);
  const [adAccountForm, setAdAccountForm] = useState({
    platform: "FACEBOOK",
    accountName: "",
    accountId: "",
    apiKey: "",
    apiSecret: "",
    accessToken: "",
    refreshToken: "",
  });

  // ---------- AI insights helper ----------

  const fetchAIInsights = async (payload: {
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    avgROAS: number;
    budgetRemaining: number;
    campaignCount: number;
    budgetCount: number;
    lowStockCount: number;
  }) => {
    try {
      setLoadingInsights(true);
      setAiError(null);

      const res = await fetch("/api/ai-dashboard-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson<any>(res);

      const insights: string[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.insights)
        ? data.insights
        : [];

      setAiInsights(insights);
    } catch (error) {
      console.error("Failed to fetch AI insights", error);
      setAiError("ไม่สามารถดึงคำแนะนำจาก AI ได้");
      setAiInsights([]);
    } finally {
      setLoadingInsights(false);
    }
  };

  // ---------- main fetch ----------

  useEffect(() => {
    if (isAuthorized) {
      fetchDashboardData();
      fetchPlatformCreds();
      fetchAdAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const aiRes = await fetch("/api/ai-settings");
      const aiData = await safeJson<any>(aiRes);

      const [productsRes, campaignsRes, budgetsRes, ordersStatsRes] =
        await Promise.all([
          fetch("/api/products"),
          fetch("/api/campaigns"),
          fetch("/api/budgets"),
          fetch("/api/orders/stats"),
        ]);

      if (
        productsRes.status === 401 ||
        campaignsRes.status === 401 ||
        budgetsRes.status === 401 ||
        ordersStatsRes.status === 401
      ) {
        console.warn("Dashboard APIs returned 401 (unauthorized)");

        setProducts([]);
        setCampaigns([]);
        setBudgets([]);
        setOrderStats(DEFAULT_ORDER_STATS);
        setStats(DEFAULT_STATS);
        setProviders([]);

        return;
      }

      const productsJson = await safeJson<any>(productsRes);
      const campaignsJson = await safeJson<any>(campaignsRes);
      const budgetsJson = await safeJson<any>(budgetsRes);
      const ordersStatsJson = await safeJson<OrderStats>(ordersStatsRes);

      const providersArray: AIProvider[] = Array.isArray(aiData)
        ? aiData
        : Array.isArray(aiData?.providers)
        ? aiData.providers
        : [];
      setProviders(providersArray);

      const productsData: Product[] = Array.isArray(productsJson)
        ? productsJson
        : (productsJson?.products as Product[]) ?? [];

      const campaignsData: Campaign[] = Array.isArray(campaignsJson)
        ? campaignsJson
        : (campaignsJson?.campaigns as Campaign[]) ?? [];

      const budgetsData: Budget[] = Array.isArray(budgetsJson)
        ? budgetsJson
        : (budgetsJson?.budgets as Budget[]) ?? [];

      setProducts(productsData);
      setCampaigns(campaignsData);
      setBudgets(budgetsData);

      setOrderStats(
        ordersStatsJson ?? {
          today: { revenue: 0, orders: 0 },
          week: { revenue: 0, orders: 0 },
        }
      );

      const metrics = calculateStats(productsData, campaignsData, budgetsData);
      setStats(metrics);

      const budgetRemaining = (budgetsData || []).reduce(
        (sum: number, b: any) =>
          sum + ((b.amount ?? b.budget ?? 0) - (b.spent ?? b.cost ?? 0)),
        0
      );

      // low stock
      const lowStock = (productsData || []).filter(
        (p: any) => typeof p.quantity === "number" && p.quantity < p.minStockLevel
      );
      setLowStockProducts(lowStock);

      // budget chart
      const budgetByCategory: Record<string, number> = {};
      (budgetsData || []).forEach((b: any) => {
        const key = b.category || b.name || "อื่น ๆ";
        const amount = b.amount ?? b.budget ?? 0;
        budgetByCategory[key] = (budgetByCategory[key] || 0) + amount;
      });
      setBudgetChartData(
        Object.entries(budgetByCategory).map(([name, value]) => ({
          name,
          value,
        }))
      );

      // platform ROI data (หยาบ ๆ)
      const roiByPlatform: Record<string, { spent: number; revenue: number }> =
        {};
      (campaignsData || []).forEach((c: any) => {
        const platform = c.platform || c.channel || "Unknown";
        const spent = c.spend ?? c.cost ?? 0;
        const revenue = c.revenue ?? c.totalRevenue ?? 0;
        if (!roiByPlatform[platform]) {
          roiByPlatform[platform] = { spent: 0, revenue: 0 };
        }
        roiByPlatform[platform].spent += spent;
        roiByPlatform[platform].revenue += revenue;
      });
      setPlatformROIData(
        Object.entries(roiByPlatform).map(([platform, v]) => ({
          platform,
          avgROI: v.spent > 0 ? v.revenue / v.spent : 0,
        }))
      );

      // line chart dummy – ถ้า backend ไม่มีข้อมูลรายวันก็ไม่เป็นไร
      setChartData([]);

      fetchAIInsights({
        ...metrics,
        budgetRemaining,
        campaignCount: campaignsData.length,
        budgetCount: budgetsData.length,
        lowStockCount: lowStock.length,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูล Dashboard ได้",
        variant: "destructive",
      });

      setProducts([]);
      setCampaigns([]);
      setBudgets([]);
      setOrderStats(DEFAULT_ORDER_STATS);
      setStats(DEFAULT_STATS);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- save AI provider ----------

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "กรุณากรอก API Key",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey,
          modelName,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast({ title: "✅ บันทึกสำเร็จ!" });
      setApiKey("");
      setModelName("");
      fetchDashboardData();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถบันทึกได้",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (providerId: string) => {
    try {
      setTestingId(providerId);
      const response = await fetch(`/api/ai-settings?id=${providerId}`, {
        method: "PUT",
      });

      const data = await response.json();

      toast({
        title: data.success ? "✅ สำเร็จ!" : "❌ ล้มเหลว",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });

      fetchDashboardData();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถทดสอบได้",
        variant: "destructive",
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSetDefault = async (providerId: string) => {
    try {
      await fetch("/api/ai-settings/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });

      toast({ title: "✅ ตั้งเป็น Default แล้ว" });
      fetchDashboardData();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถตั้งค่าได้",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (providerId: string) => {
    if (!confirm("ยืนยันการลบ?")) return;

    try {
      await fetch(`/api/ai-settings?id=${providerId}`, {
        method: "DELETE",
      });

      toast({ title: "✅ ลบสำเร็จ" });
      fetchDashboardData();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถลบได้",
        variant: "destructive",
      });
    }
  };

  // ---------- Platform Credentials ----------

  const fetchPlatformCreds = async () => {
    try {
      setLoadingPlatformCreds(true);
      const res = await fetch("/api/platform-credentials");
      if (res.ok) {
        const data = await res.json();
        const list: PlatformCredential[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.credentials)
          ? data.credentials
          : [];
        setPlatformCreds(list);
      } else {
        setPlatformCreds([]);
      }
    } catch (error) {
      console.error("Failed to fetch platform credentials:", error);
      setPlatformCreds([]);
    } finally {
      setLoadingPlatformCreds(false);
    }
  };

  const handleSavePlatformCred = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/platform-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platformForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save credential");
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึก API Key / Token ของแพลตฟอร์มแล้ว",
      });

      setPlatformForm((prev) => ({
        ...prev,
        apiKey: "",
        apiSecret: "",
        accessToken: "",
        refreshToken: "",
      }));

      fetchPlatformCreds();
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
    }
  };

  const handleTestPlatformCred = async (id: string) => {
    try {
      setTestingPlatformId(id);
      const res = await fetch("/api/platform-credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "✅ เชื่อมต่อสำเร็จ",
          description: data.message,
        });
      } else {
        toast({
          title: "❌ เชื่อมต่อไม่สำเร็จ",
          description: data.message,
          variant: "destructive",
        });
      }

      fetchPlatformCreds();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถทดสอบการเชื่อมต่อได้",
        variant: "destructive",
      });
    } finally {
      setTestingPlatformId(null);
    }
  };

  const handleDeletePlatformCred = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบ API Credential นี้?")) return;

    try {
      const res = await fetch(`/api/platform-credentials?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete credential");

      toast({
        title: "ลบสำเร็จ",
        description: "ลบข้อมูล API Key / Token เรียบร้อยแล้ว",
      });

      fetchPlatformCreds();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถลบข้อมูลได้",
        variant: "destructive",
      });
    }
  };

  // ---------- Ad Accounts ----------

  const fetchAdAccounts = async () => {
    try {
      setLoadingAdAccounts(true);
      const res = await fetch("/api/ad-accounts");
      if (res.ok) {
        const data = await res.json();
        const list: AdAccount[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.accounts)
          ? data.accounts
          : [];
        setAdAccounts(list);
      } else {
        setAdAccounts([]);
      }
    } catch (error) {
      console.error("Failed to fetch ad accounts:", error);
      setAdAccounts([]);
    } finally {
      setLoadingAdAccounts(false);
    }
  };

  const handleAddAdAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/ad-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adAccountForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add ad account");
      }

      toast({
        title: "✅ เพิ่มสำเร็จ",
        description: "เพิ่ม Ad Account เรียบร้อยแล้ว",
      });

      setIsAdAccountDialogOpen(false);
      setAdAccountForm({
        platform: "FACEBOOK",
        accountName: "",
        accountId: "",
        apiKey: "",
        apiSecret: "",
        accessToken: "",
        refreshToken: "",
      });

      fetchAdAccounts();
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถเพิ่ม Ad Account ได้",
        variant: "destructive",
      });
    }
  };

  const handleTestAdAccount = async (account: AdAccount) => {
    try {
      setTestingAdAccount(account.id);
      const res = await fetch("/api/ad-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: account.id,
          platform: account.platform,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "✅ ทดสอบสำเร็จ",
          description: data.message,
        });
      } else {
        toast({
          title: "❌ ทดสอบไม่สำเร็จ",
          description: data.message,
          variant: "destructive",
        });
      }

      fetchAdAccounts();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถทดสอบการเชื่อมต่อได้",
        variant: "destructive",
      });
    } finally {
      setTestingAdAccount(null);
    }
  };

  const handleSetDefaultAdAccount = async (id: string, platform: string) => {
    try {
      const res = await fetch("/api/ad-accounts/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, platform }),
      });

      if (!res.ok) throw new Error("Failed to set default");

      toast({
        title: "✅ ตั้งเป็น Default แล้ว",
        description: "Ad Account นี้ถูกตั้งเป็นค่าเริ่มต้นแล้ว",
      });

      fetchAdAccounts();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถตั้งค่าได้",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdAccount = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบ Ad Account นี้?")) return;

    try {
      const res = await fetch(`/api/ad-accounts?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete ad account");

      toast({
        title: "✅ ลบสำเร็จ",
        description: "ลบ Ad Account เรียบร้อยแล้ว",
      });

      fetchAdAccounts();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถลบได้",
        variant: "destructive",
      });
    }
  };

  // ---------- guards ----------

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  // ---------- JSX ----------

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          AI Provider Settings
        </h1>
        <p className="text-gray-600 mt-1">
          ตั้งค่า AI และ Model สำหรับใช้ในระบบ
        </p>
      </div>

      {/* LINE Sales Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              ยอดขายวันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ฿{orderStats.today.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {orderStats.today.orders} ออเดอร์
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              ยอดขาย 7 วัน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ฿{orderStats.week.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {orderStats.week.orders} ออเดอร์
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 - Profit */}
        <Card className="stat-card-pink hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/90">
                กำไรรวม
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <div className="text-3xl font-bold text-white">
              {formatCurrency(stats.totalProfit)}
            </div>
            <p className="text-xs text-white/80 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {stats.totalProfit > 0 ? "+" : ""}
              {stats.totalRevenue > 0
                ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)
                : 0}
              % margin
            </p>
          </CardContent>
        </Card>

        {/* Card 2 - Revenue */}
        <Card className="stat-card-purple hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/90">
                รายได้
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <div className="text-3xl font-bold text-white">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-white/80 mt-2">จากแคมเปญทั้งหมด</p>
          </CardContent>
        </Card>

        {/* Card 3 - Orders */}
        <Card className="stat-card-cyan hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/90">
                ออเดอร์
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <div className="text-3xl font-bold text-white">
              {formatNumber(stats.totalOrders)}
            </div>
            <p className="text-xs text-white/80">Conversions ทั้งหมด</p>
          </CardContent>
        </Card>

        {/* Card 4 - ROAS */}
        <Card className="stat-card-orange hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/90">
                ROAS เฉลี่ย
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <div className="text-3xl font-bold text-white">
              {stats.avgROAS.toFixed(2)}x
            </div>
            <p className="text-xs text-white/80">Return on Ad Spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Revenue vs Spent */}
        <Card className="bg-white border border-gray-200 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">
              รายได้ vs ค่าใช้จ่าย (7 วัน)
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-600">
              แนวโน้มรายได้และค่าใช้จ่ายย้อนหลัง 7 วัน
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    className="text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    className="text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="line" />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#ec4899"
                    strokeWidth={3}
                    name="รายได้"
                    dot={{ fill: "#ec4899", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spent"
                    stroke="#a855f7"
                    strokeWidth={3}
                    name="ค่าใช้จ่าย"
                    dot={{ fill: "#a855f7", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    name="กำไร"
                    dot={{ fill: "#06b6d4", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ROI by Platform */}
        <Card className="bg-white border border-gray-200 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">
              ROI แต่ละ Platform
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-600">
              เปรียบเทียบประสิทธิภาพแต่ละแพลตฟอร์ม
            </CardDescription>
          </CardHeader>
          <CardContent>
            {platformROIData.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={platformROIData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="platform"
                    className="text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    className="text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar
                    dataKey="avgROI"
                    fill="#06b6d4"
                    name="Average ROI"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Budget Pie */}
        <Card className="bg-white border border-gray-200 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">
              สัดส่วนงบประมาณ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={budgetChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#ec4899"
                    dataKey="value"
                  >
                    {budgetChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [
                      `฿${value.toLocaleString()}`,
                      "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="bg-white border border-gray-200 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold text-gray-800">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
              สินค้าใกล้หมดสต็อก
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ไม่มีสินค้าใกล้หมด
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="text-right">คงเหลือ</TableHead>
                      <TableHead className="text-right">ขั้นต่ำ</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockProducts.map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.minStockLevel}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.quantity === 0
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {product.quantity === 0 ? "หมด" : "ใกล้หมด"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {!loading && (
        <Card className="bg-gradient-to-br from-white to-pink-50 border border-pink-200 shadow-md rounded-2xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg md:text-xl font-bold text-gray-800">
                  AI Insights & Recommendations
                </span>
              </CardTitle>
              <Button
                size="sm"
                className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white border-0 shadow-md"
                onClick={() => router.push("/ai-chat")}
              >
                <Bot className="w-4 h-4 mr-2" />
                ดูทั้งหมด
              </Button>
            </div>
            <CardDescription className="text-sm md:text-base text-gray-600 mt-2">
              คำแนะนำจาก AI วิเคราะห์ธุรกิจของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInsights ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
              </div>
            ) : aiInsights.length > 0 ? (
              <ul className="space-y-3">
                {aiInsights.map((insight, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-pink-200 hover:shadow-sm transition-all"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 flex-1">{insight}</span>
                  </li>
                ))}
              </ul>
            ) : aiError ? (
              <p className="text-gray-600">{aiError}</p>
            ) : (
              <p className="text-gray-600">
                เพิ่มข้อมูลสินค้าและแคมเปญเพื่อรับคำแนะนำจาก AI
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Provider Add */}
      <Card className="bg-white border border-gray-200 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-gray-800">
            เพิ่ม AI Provider
          </CardTitle>
          <CardDescription className="text-gray-600">
            เลือก Provider และใส่ API Key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label className="text-gray-700 font-semibold">
                AI Provider
              </Label>
              <Select
                value={selectedProvider}
                onValueChange={(v) =>
                  setSelectedProvider(v as "GEMINI" | "OPENAI" | "N8N")
                }
              >
                <SelectTrigger className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-gray-300">
                  <SelectItem
                    value="GEMINI"
                    className="font-semibold text-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Google Gemini
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="OPENAI"
                    className="font-semibold text-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      OpenAI GPT
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="N8N"
                    className="font-semibold text-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      n8n Workflow
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-700 font-semibold">
                Model Name (Optional)
              </Label>
              <Input
                placeholder="เช่น gemini-pro, gpt-4"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-700 font-semibold">
              {selectedProvider === "N8N" ? "Webhook URL" : "API Key"}
            </Label>
            <Input
              type="password"
              placeholder={
                selectedProvider === "N8N"
                  ? "https://n8n.example.com/webhook/..."
                  : "AIza... หรือ sk-..."
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1"
            />
            <p className="text-xs text-gray-600 mt-1">
              {selectedProvider === "GEMINI" && (
                <>
                  Get API key from{" "}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </>
              )}
              {selectedProvider === "OPENAI" && (
                <>
                  Get API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </>
              )}
              {selectedProvider === "N8N" &&
                "Webhook URL จาก n8n workflow ของคุณ"}
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            บันทึก API Key
          </Button>
        </CardContent>
      </Card>

      {/* Existing Providers */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-gray-800">
            AI Providers ที่บันทึกไว้
          </CardTitle>
          <CardDescription className="text-gray-600">
            จัดการและทดสอบ API Keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>ยังไม่มี AI Provider</p>
              <p className="text-sm mt-2">
                เพิ่ม Provider ด้านบนเพื่อเริ่มใช้งาน
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-800">
                        {provider.provider === "GEMINI" && "Google Gemini"}
                        {provider.provider === "OPENAI" && "OpenAI GPT"}
                        {provider.provider === "N8N" && "n8n Workflow"}
                      </h3>
                      {provider.isDefault && (
                        <Badge className="bg-blue-500">ค่าเริ่มต้น</Badge>
                      )}
                      {provider.isValid ? (
                        <Badge className="bg-green-500">
                          <Check className="w-3 h-3 mr-1" />
                          ใช้งานได้
                        </Badge>
                      ) : provider.lastTested ? (
                        <Badge variant="destructive">
                          <X className="w-3 h-3 mr-1" />
                          ใช้งานไม่ได้
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <X className="w-3 h-3 mr-1" />
                          ยังไม่ทดสอบ
                        </Badge>
                      )}
                    </div>
                    {provider.modelName && (
                      <p className="text-sm text-gray-600 mt-1">
                        Model: {provider.modelName}
                      </p>
                    )}
                    {provider.lastTested && (
                      <p className="text-xs text-gray-500 mt-1">
                        ทดสอบล่าสุด{" "}
                        {new Date(provider.lastTested).toLocaleString("th-TH")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(provider.id)}
                      disabled={testingId === provider.id}
                      className="flex-1 sm:flex-none border-2 border-purple-300"
                    >
                      {testingId === provider.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span className="ml-2">ทดสอบ</span>
                    </Button>

                    {provider.isValid && !provider.isDefault && (
                      <Button
                        size="sm"
                        onClick={() => handleSetDefault(provider.id)}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-cyan-500"
                      >
                        ตั้งเป็นค่าเริ่มต้น
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(provider.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform API Credentials */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-gray-800 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-purple-500" />
            Platform API Settings
          </CardTitle>
          <CardDescription className="text-gray-600">
            ตั้งค่า API Key / Token สำหรับเชื่อมต่อ Facebook Ads, TikTok Ads,
            Shopee, Lazada ฯลฯ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={handleSavePlatformCred}
          >
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Platform</Label>
              <Select
                value={platformForm.platform}
                onValueChange={(value) =>
                  setPlatformForm((prev) => ({ ...prev, platform: value }))
                }
              >
                <SelectTrigger className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-gray-300">
                  <SelectItem value="FACEBOOK_ADS">Facebook Ads</SelectItem>
                  <SelectItem value="TIKTOK_ADS">TikTok Ads</SelectItem>
                  <SelectItem value="SHOPEE">Shopee</SelectItem>
                  <SelectItem value="LAZADA">Lazada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">API Key</Label>
              <Input
                value={platformForm.apiKey}
                onChange={(e) =>
                  setPlatformForm((prev) => ({
                    ...prev,
                    apiKey: e.target.value,
                  }))
                }
                className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1"
                placeholder="API Key"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">
                API Secret (ถ้ามี)
              </Label>
              <Input
                type="password"
                value={platformForm.apiSecret}
                onChange={(e) =>
                  setPlatformForm((prev) => ({
                    ...prev,
                    apiSecret: e.target.value,
                  }))
                }
                className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1"
                placeholder="API Secret"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">
                Access Token / Refresh Token
              </Label>
              <Input
                type="password"
                value={platformForm.accessToken}
                onChange={(e) =>
                  setPlatformForm((prev) => ({
                    ...prev,
                    accessToken: e.target.value,
                  }))
                }
                className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1"
                placeholder="Access Token"
              />
              <Input
                type="password"
                value={platformForm.refreshToken}
                onChange={(e) =>
                  setPlatformForm((prev) => ({
                    ...prev,
                    refreshToken: e.target.value,
                  }))
                }
                className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-2"
                placeholder="Refresh Token (ถ้ามี)"
              />
            </div>

            <div className="md:col-span-2">
              <Button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                บันทึก Platform API
              </Button>
            </div>
          </form>

          <div className="pt-4">
            <h3 className="font-semibold text-gray-800 mb-2">
              Platform API ที่บันทึกไว้
            </h3>
            {loadingPlatformCreds ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              </div>
            ) : platformCreds.length === 0 ? (
              <p className="text-sm text-gray-500">
                ยังไม่มี Platform API ที่บันทึกไว้
              </p>
            ) : (
              <div className="space-y-3">
                {platformCreds.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {cred.platform}
                      </p>
                      {cred.lastTested && (
                        <p className="text-xs text-gray-500">
                          ทดสอบล่าสุด{" "}
                          {new Date(
                            cred.lastTested
                          ).toLocaleString("th-TH")}
                        </p>
                      )}
                      {cred.testMessage && (
                        <p className="text-xs text-gray-600">
                          {cred.testMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        className={
                          cred.isValid
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }
                      >
                        {cred.isValid ? "ใช้งานได้" : "เชื่อมต่อไม่สำเร็จ"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestPlatformCred(cred.id)}
                        disabled={testingPlatformId === cred.id}
                      >
                        {testingPlatformId === cred.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <TestTube2 className="w-4 h-4 mr-1" />
                        )}
                        ทดสอบ
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePlatformCred(cred.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ad Accounts Section */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg md:text-xl text-gray-800 flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              บัญชีโฆษณา (Ad Accounts)
            </CardTitle>
            <CardDescription className="text-gray-600">
              จัดการบัญชีโฆษณาสำหรับ Facebook / TikTok / Google / LINE
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAdAccountDialogOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            เพิ่ม Ad Account
          </Button>
        </CardHeader>
        <CardContent>
          {loadingAdAccounts ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : adAccounts.length === 0 ? (
            <p className="text-sm text-gray-600">
              ยังไม่มีบัญชีโฆษณา เพิ่มบัญชีใหม่เพื่อเริ่มเชื่อมต่อ
            </p>
          ) : (
            <div className="space-y-3">
              {adAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg bg-gray-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">
                        {acc.accountName || acc.accountId || "Unnamed Account"}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {acc.platform}
                      </Badge>
                      {acc.isDefault && (
                        <Badge className="bg-blue-500 text-white text-xs">
                          Default
                        </Badge>
                      )}
                      {acc.isActive ? (
                        <Badge className="bg-green-500 text-white text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                      {acc.isValid ? (
                        <Badge className="bg-green-500 text-white text-xs">
                          ใช้งานได้
                        </Badge>
                      ) : acc.lastTested ? (
                        <Badge className="bg-red-500 text-white text-xs">
                          ใช้งานไม่ได้
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          ยังไม่ทดสอบ
                        </Badge>
                      )}
                    </div>
                    {acc.accountId && (
                      <p className="text-xs text-gray-600 mt-1">
                        Account ID: {acc.accountId}
                      </p>
                    )}
                    {acc.lastTested && (
                      <p className="text-xs text-gray-500">
                        ทดสอบล่าสุด{" "}
                        {new Date(acc.lastTested).toLocaleString("th-TH")}
                      </p>
                    )}
                    {acc.testMessage && (
                      <p className="text-xs text-gray-600">
                        ผลการทดสอบ: {acc.testMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestAdAccount(acc)}
                      disabled={testingAdAccount === acc.id}
                    >
                      {testingAdAccount === acc.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <TestTube2 className="w-4 h-4 mr-1" />
                      )}
                      ทดสอบ
                    </Button>
                    {!acc.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleSetDefaultAdAccount(acc.id, acc.platform)
                        }
                      >
                        ตั้งเป็น Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAdAccount(acc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Add Ad Account */}
      <Dialog
        open={isAdAccountDialogOpen}
        onOpenChange={setIsAdAccountDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่ม Ad Account ใหม่</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAddAdAccount}>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={adAccountForm.platform}
                onValueChange={(value) =>
                  setAdAccountForm((prev) => ({ ...prev, platform: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACEBOOK">Facebook Ads</SelectItem>
                  <SelectItem value="GOOGLE">Google Ads</SelectItem>
                  <SelectItem value="TIKTOK">TikTok Ads</SelectItem>
                  <SelectItem value="LINE">LINE Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ชื่อบัญชี</Label>
              <Input
                value={adAccountForm.accountName}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    accountName: e.target.value,
                  }))
                }
                placeholder="เช่น Main Facebook Ads"
              />
            </div>

            <div className="space-y-2">
              <Label>Account ID (ถ้ามี)</Label>
              <Input
                value={adAccountForm.accountId}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    accountId: e.target.value,
                  }))
                }
                placeholder="เช่น act_123456789"
              />
            </div>

            <div className="space-y-2">
              <Label>API Key / Access Token</Label>
              <Input
                type="password"
                value={adAccountForm.apiKey}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    apiKey: e.target.value,
                  }))
                }
                placeholder="API Key (ถ้ามี)"
              />
              <Input
                type="password"
                value={adAccountForm.accessToken}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    accessToken: e.target.value,
                  }))
                }
                placeholder="Access Token"
              />
            </div>

            <div className="space-y-2">
              <Label>API Secret / Refresh Token (ถ้ามี)</Label>
              <Input
                type="password"
                value={adAccountForm.apiSecret}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    apiSecret: e.target.value,
                  }))
                }
                placeholder="API Secret"
              />
              <Input
                type="password"
                value={adAccountForm.refreshToken}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    refreshToken: e.target.value,
                  }))
                }
                placeholder="Refresh Token"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdAccountDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
              >
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
