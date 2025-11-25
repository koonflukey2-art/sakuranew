"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  TestTube,
  Play,
} from "lucide-react";
import { TableSkeleton } from "@/components/loading-states";
import { ErrorState } from "@/components/empty-states";

interface AdAccount {
  id: string;
  platform: "FACEBOOK" | "TIKTOK" | "LAZADA" | "SHOPEE";
  apiKey: string;
  apiKeyFull?: string;
  accountId?: string;
  isActive: boolean;
  isValid: boolean;
  lastTested?: string;
  createdAt: string;
}

interface AdRule {
  id: string;
  name: string;
  description?: string;
  platform?: "FACEBOOK" | "TIKTOK" | "LAZADA" | "SHOPEE";
  condition: string;
  action: "PAUSE_CAMPAIGNS" | "RESUME_CAMPAIGNS" | "INCREASE_BUDGET" | "DECREASE_BUDGET";
  status: "ACTIVE" | "INACTIVE";
  useAI: boolean;
  createdAt: string;
}

const platformLabels: Record<string, string> = {
  FACEBOOK: "Facebook Ads",
  TIKTOK: "TikTok Ads",
  LAZADA: "Lazada Ads",
  SHOPEE: "Shopee Ads",
};

const actionLabels: Record<string, string> = {
  PAUSE_CAMPAIGNS: "หยุดแคมเปญ",
  RESUME_CAMPAIGNS: "เปิดแคมเปญ",
  INCREASE_BUDGET: "เพิ่มงบประมาณ",
  DECREASE_BUDGET: "ลดงบประมาณ",
};

export default function AdSettingsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [rules, setRules] = useState<AdRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const { toast } = useToast();

  const [accountForm, setAccountForm] = useState({
    id: "",
    platform: "FACEBOOK" as const,
    apiKey: "",
    accountId: "",
  });

  const [ruleForm, setRuleForm] = useState({
    id: "",
    name: "",
    description: "",
    platform: "" as any,
    condition: "",
    action: "PAUSE_CAMPAIGNS" as const,
    useAI: true,
    status: "ACTIVE" as const,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [accountsRes, rulesRes] = await Promise.all([
        fetch("/api/ad-accounts"),
        fetch("/api/ad-rules"),
      ]);

      if (!accountsRes.ok || !rulesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [accountsData, rulesData] = await Promise.all([
        accountsRes.json(),
        rulesRes.json(),
      ]);

      setAccounts(accountsData);
      setRules(rulesData);
    } catch (error) {
      setError("ไม่สามารถโหลดข้อมูลได้");
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountForm.apiKey) {
      toast({
        title: "กรุณากรอก API Key",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const method = accountForm.id ? "PUT" : "POST";
      const response = await fetch("/api/ad-accounts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed");
      }

      toast({
        title: "สำเร็จ!",
        description: accountForm.id
          ? "อัพเดท Ad Account เรียบร้อย"
          : "เพิ่ม Ad Account เรียบร้อย",
      });

      setIsAccountDialogOpen(false);
      setAccountForm({
        id: "",
        platform: "FACEBOOK",
        apiKey: "",
        accountId: "",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกได้",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestAccount = async (id: string) => {
    try {
      setTesting(id);
      const response = await fetch("/api/ad-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed");
      }

      toast({
        title: data.isValid ? "สำเร็จ!" : "ล้มเหลว",
        description: data.message,
        variant: data.isValid ? "default" : "destructive",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถทดสอบได้",
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบ Ad Account นี้?")) return;

    try {
      const response = await fetch(`/api/ad-accounts?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed");

      toast({
        title: "สำเร็จ!",
        description: "ลบ Ad Account เรียบร้อย",
      });

      fetchData();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถลบได้",
        variant: "destructive",
      });
    }
  };

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ruleForm.name || !ruleForm.condition) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบ",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const method = ruleForm.id ? "PUT" : "POST";
      const response = await fetch("/api/ad-rules", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed");
      }

      toast({
        title: "สำเร็จ!",
        description: ruleForm.id
          ? "อัพเดท Rule เรียบร้อย"
          : "สร้าง Rule เรียบร้อย",
      });

      setIsRuleDialogOpen(false);
      setRuleForm({
        id: "",
        name: "",
        description: "",
        platform: "",
        condition: "",
        action: "PAUSE_CAMPAIGNS",
        useAI: true,
        status: "ACTIVE",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกได้",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluateRule = async (ruleId: string) => {
    try {
      setEvaluating(ruleId);
      const response = await fetch("/api/ad-rules/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed");
      }

      toast({
        title: data.evaluation.shouldExecute ? "ควรดำเนินการ" : "ไม่ควรดำเนินการ",
        description: data.evaluation.reason,
        variant: data.evaluation.shouldExecute ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถประเมินได้",
        variant: "destructive",
      });
    } finally {
      setEvaluating(null);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบ Rule นี้?")) return;

    try {
      const response = await fetch(`/api/ad-rules?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed");

      toast({
        title: "สำเร็จ!",
        description: "ลบ Rule เรียบร้อย",
      });

      fetchData();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถลบได้",
        variant: "destructive",
      });
    }
  };

  if (loading) return <TableSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Ad Settings</h1>
        <p className="text-slate-400 mt-1">จัดการ API Keys และ Auto Rules สำหรับโฆษณา</p>
      </div>

      {/* Ad Accounts */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Ad Account API Keys</CardTitle>
            <CardDescription className="text-slate-400">
              เชื่อมต่อ API ของแพลตฟอร์มโฆษณา
            </CardDescription>
          </div>
          <Button onClick={() => setIsAccountDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่ม Account
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>ยังไม่มี Ad Account</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-slate-300">Platform</TableHead>
                  <TableHead className="text-slate-300">API Key</TableHead>
                  <TableHead className="text-slate-300">Account ID</TableHead>
                  <TableHead className="text-slate-300">สถานะ</TableHead>
                  <TableHead className="text-slate-300">ทดสอบล่าสุด</TableHead>
                  <TableHead className="text-right text-slate-300">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="text-white font-semibold">
                      {platformLabels[account.platform]}
                    </TableCell>
                    <TableCell className="text-slate-300 font-mono">
                      {account.apiKey}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {account.accountId || "-"}
                    </TableCell>
                    <TableCell>
                      {account.isValid ? (
                        <Badge className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" /> ใช้งานได้
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" /> ยังไม่ทดสอบ
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {account.lastTested
                        ? new Date(account.lastTested).toLocaleDateString("th-TH")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestAccount(account.id)}
                          disabled={testing === account.id}
                        >
                          {testing === account.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <TestTube className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteAccount(account.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ad Rules */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Auto Rules</CardTitle>
            <CardDescription className="text-slate-400">
              กฏอัตโนมัติสำหรับจัดการโฆษณา (ควบคุมด้วย AI)
            </CardDescription>
          </div>
          <Button onClick={() => setIsRuleDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            สร้าง Rule
          </Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>ยังไม่มี Auto Rules</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-slate-300">ชื่อ Rule</TableHead>
                  <TableHead className="text-slate-300">Platform</TableHead>
                  <TableHead className="text-slate-300">เงื่อนไข</TableHead>
                  <TableHead className="text-slate-300">การกระทำ</TableHead>
                  <TableHead className="text-slate-300">สถานะ</TableHead>
                  <TableHead className="text-right text-slate-300">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="text-white font-semibold">
                      <div>
                        <div>{rule.name}</div>
                        {rule.description && (
                          <div className="text-xs text-slate-500">
                            {rule.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {rule.platform ? platformLabels[rule.platform] : "ทั้งหมด"}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <div className="max-w-xs truncate">{rule.condition}</div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {actionLabels[rule.action]}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          rule.status === "ACTIVE" ? "bg-green-600" : "bg-gray-600"
                        }
                      >
                        {rule.status === "ACTIVE" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEvaluateRule(rule.id)}
                          disabled={evaluating === rule.id}
                        >
                          {evaluating === rule.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ad Account Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่ม Ad Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div>
              <Label>Platform</Label>
              <Select
                value={accountForm.platform}
                onValueChange={(value: any) =>
                  setAccountForm({ ...accountForm, platform: value })
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACEBOOK">Facebook Ads</SelectItem>
                  <SelectItem value="TIKTOK">TikTok Ads</SelectItem>
                  <SelectItem value="LAZADA">Lazada Ads</SelectItem>
                  <SelectItem value="SHOPEE">Shopee Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>API Key</Label>
              <Input
                type="text"
                value={accountForm.apiKey}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, apiKey: e.target.value })
                }
                placeholder="ใส่ API Key"
                disabled={submitting}
              />
            </div>

            <div>
              <Label>Account ID (Optional)</Label>
              <Input
                type="text"
                value={accountForm.accountId}
                onChange={(e) =>
                  setAccountForm({ ...accountForm, accountId: e.target.value })
                }
                placeholder="ใส่ Account ID (ถ้ามี)"
                disabled={submitting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAccountDialogOpen(false)}
                disabled={submitting}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ad Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>สร้าง Auto Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRuleSubmit} className="space-y-4">
            <div>
              <Label>ชื่อ Rule</Label>
              <Input
                type="text"
                value={ruleForm.name}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, name: e.target.value })
                }
                placeholder="เช่น หยุดแคมเปญเมื่อ CPA สูงเกินไป"
                disabled={submitting}
              />
            </div>

            <div>
              <Label>คำอธิบาย (Optional)</Label>
              <Input
                type="text"
                value={ruleForm.description}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, description: e.target.value })
                }
                placeholder="อธิบายเพิ่มเติม"
                disabled={submitting}
              />
            </div>

            <div>
              <Label>Platform (Optional - ใส่ถ้าต้องการเฉพาะ platform)</Label>
              <Select
                value={ruleForm.platform || ""}
                onValueChange={(value: any) =>
                  setRuleForm({ ...ruleForm, platform: value || null })
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">ทั้งหมด</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook Ads</SelectItem>
                  <SelectItem value="TIKTOK">TikTok Ads</SelectItem>
                  <SelectItem value="LAZADA">Lazada Ads</SelectItem>
                  <SelectItem value="SHOPEE">Shopee Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>เงื่อนไข</Label>
              <Textarea
                value={ruleForm.condition}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, condition: e.target.value })
                }
                placeholder="เช่น CPA > 200 หรือ ROI < 1.5"
                rows={3}
                disabled={submitting}
              />
            </div>

            <div>
              <Label>การกระทำ</Label>
              <Select
                value={ruleForm.action}
                onValueChange={(value: any) =>
                  setRuleForm({ ...ruleForm, action: value })
                }
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAUSE_CAMPAIGNS">หยุดแคมเปญ</SelectItem>
                  <SelectItem value="RESUME_CAMPAIGNS">เปิดแคมเปญ</SelectItem>
                  <SelectItem value="INCREASE_BUDGET">เพิ่มงบประมาณ</SelectItem>
                  <SelectItem value="DECREASE_BUDGET">ลดงบประมาณ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useAI"
                checked={ruleForm.useAI}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, useAI: e.target.checked })
                }
                disabled={submitting}
              />
              <Label htmlFor="useAI">ใช้ AI ในการประเมิน</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRuleDialogOpen(false)}
                disabled={submitting}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                สร้าง Rule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
