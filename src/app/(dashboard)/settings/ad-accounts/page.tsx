"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plug2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";

interface AdAccount {
  id: string;
  platform: "FACEBOOK" | "GOOGLE" | "TIKTOK" | "LINE";
  accountName: string;
  accountId: string;
  isActive: boolean;
  isDefault: boolean;
  isValid: boolean;
  lastTested?: string;
  testMessage?: string | null;
  currency: string;
  timezone: string;
  createdAt: string;
}

interface AdAccountFormState {
  platform: AdAccount["platform"];
  accountName: string;
  accountId: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  refreshToken: string;
  currency: string;
  timezone: string;
  isActive: boolean;
  isDefault: boolean;
}

const defaultFormState: AdAccountFormState = {
  platform: "FACEBOOK",
  accountName: "",
  accountId: "",
  apiKey: "",
  apiSecret: "",
  accessToken: "",
  refreshToken: "",
  currency: "THB",
  timezone: "Asia/Bangkok",
  isActive: true,
  isDefault: false,
};

const platformLabels: Record<AdAccount["platform"], string> = {
  FACEBOOK: "Facebook",
  GOOGLE: "Google",
  TIKTOK: "TikTok",
  LINE: "LINE",
};

export default function AdAccountsSettingsPage() {
  const { toast } = useToast();
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<AdAccountFormState>(defaultFormState);
  const [openDialog, setOpenDialog] = useState(false);

  const sortedAdAccounts = useMemo(
    () =>
      [...adAccounts].sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [adAccounts]
  );

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  const fetchAdAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ad-accounts");
      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดข้อมูลบัญชีโฆษณาได้");
      }
      const data = await response.json();
      setAdAccounts(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "โหลดข้อมูลไม่สำเร็จ",
        description: error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formState.accountName || !formState.accountId || !formState.apiKey) {
      toast({
        variant: "destructive",
        title: "กรุณากรอกข้อมูลให้ครบ",
        description: "อย่างน้อยต้องใส่ Platform, ชื่อบัญชี, Account ID และ API Key",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/ad-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formState }),
      });

      const data = (await response.json().catch(() => null)) as AdAccount | null;
      if (!response.ok) {
        throw new Error(data?.error || "ไม่สามารถสร้างบัญชีโฆษณาได้");
      }

      toast({ title: "สร้างบัญชีโฆษณาสำเร็จ" });
      if (formState.isDefault && data?.id) {
        await handleSetDefault({ ...data, platform: formState.platform } as AdAccount);
      }
      setOpenDialog(false);
      setFormState(defaultFormState);
      fetchAdAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "สร้างบัญชีไม่สำเร็จ",
        description: error.message || "ไม่สามารถสร้างบัญชีโฆษณาได้",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบบัญชีโฆษณานี้?")) return;

    try {
      setDeletingId(id);
      const response = await fetch(`/api/ad-accounts?id=${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("ไม่สามารถลบได้");
      }
      toast({ title: "ลบสำเร็จ" });
      fetchAdAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "ลบไม่สำเร็จ",
        description: error.message || "เกิดข้อผิดพลาดในการลบ",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (account: AdAccount) => {
    try {
      const response = await fetch("/api/ad-accounts/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id, platform: account.platform }),
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถตั้งค่า Default ได้");
      }

      toast({ title: "ตั้งบัญชีเริ่มต้นสำเร็จ" });
      fetchAdAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "ตั้งค่าไม่สำเร็จ",
        description: error.message || "ไม่สามารถตั้งบัญชีเป็นค่าเริ่มต้นได้",
      });
    }
  };

  const handleTest = async (account: AdAccount) => {
    try {
      setTestingId(account.id);
      const response = await fetch("/api/ad-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "ทดสอบไม่สำเร็จ");
      }

      toast({
        title: data?.success ? "เชื่อมต่อสำเร็จ" : "เชื่อมต่อไม่สำเร็จ",
        description: data?.message,
        variant: data?.success ? "default" : "destructive",
      });
      fetchAdAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "ทดสอบไม่สำเร็จ",
        description: error.message || "ไม่สามารถทดสอบการเชื่อมต่อได้",
      });
    } finally {
      setTestingId(null);
    }
  };

  const renderStatusBadges = (account: AdAccount) => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="bg-slate-800 text-slate-100 border border-slate-700">
        {platformLabels[account.platform]}
      </Badge>
      {account.isDefault && <Badge className="bg-blue-600">Default</Badge>}
      {account.isValid ? (
        <Badge className="bg-emerald-600 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> Connected
        </Badge>
      ) : (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Plug2 className="h-3 w-3" /> Not Connected
        </Badge>
      )}
      {!account.isActive && <Badge variant="secondary">Inactive</Badge>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Ad Accounts</h1>
        <p className="text-slate-400 mt-1">
          จัดการการเชื่อมต่อบัญชีโฆษณาสำหรับ Facebook, Google, TikTok และ LINE
        </p>
      </div>

      <Card className="bg-slate-900/80 border-slate-700">
        <CardHeader className="flex items-center justify-between space-y-0 gap-4">
          <div>
            <CardTitle className="text-white">รายการ Ad Accounts</CardTitle>
            <CardDescription className="text-slate-400">
              เพิ่ม ลบ ทดสอบการเชื่อมต่อ และตั้งค่า Default
            </CardDescription>
          </div>
          <Button onClick={() => setOpenDialog(true)}>เพิ่มบัญชีใหม่</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> กำลังโหลดข้อมูล...
            </div>
          ) : sortedAdAccounts.length === 0 ? (
            <div className="text-center py-10 text-slate-300">
              ยังไม่มีการเชื่อมต่อ Ad Account เริ่มต้นด้วยการเพิ่มบัญชีใหม่
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-slate-200">บัญชี</TableHead>
                    <TableHead className="text-slate-200">Account ID</TableHead>
                    <TableHead className="text-slate-200">สถานะ</TableHead>
                    <TableHead className="text-slate-200">ผลการทดสอบล่าสุด</TableHead>
                    <TableHead className="text-right text-slate-200">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAdAccounts.map((account) => (
                    <TableRow key={account.id} className="hover:bg-slate-800/60">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold text-white">{account.accountName}</p>
                          <p className="text-xs text-slate-400">
                            เพิ่มเมื่อ {new Date(account.createdAt).toLocaleString("th-TH")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-200">{account.accountId}</TableCell>
                      <TableCell>{renderStatusBadges(account)}</TableCell>
                      <TableCell className="text-slate-200">
                        {account.testMessage || "ยังไม่เคยทดสอบ"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTest(account)}
                            disabled={testingId === account.id}
                          >
                            {testingId === account.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="ml-2">ทดสอบ</span>
                          </Button>
                          {!account.isDefault && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleSetDefault(account)}
                            >
                              ตั้งเป็น Default
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(account.id)}
                            disabled={deletingId === account.id}
                          >
                            {deletingId === account.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>เพิ่ม Ad Account</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลเพื่อเชื่อมต่อบัญชีโฆษณา ข้อมูลสำคัญจะถูกเข้ารหัสก่อนจัดเก็บ
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>แพลตฟอร์ม</Label>
              <Select
                value={formState.platform}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, platform: value as AdAccount["platform"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกแพลตฟอร์ม" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="GOOGLE">Google</SelectItem>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                  <SelectItem value="LINE">LINE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ชื่อบัญชี</Label>
              <Input
                value={formState.accountName}
                onChange={(e) => setFormState((prev) => ({ ...prev, accountName: e.target.value }))}
                placeholder="เช่น Main Ads Account"
              />
            </div>
            <div className="space-y-2">
              <Label>Account ID</Label>
              <Input
                value={formState.accountId}
                onChange={(e) => setFormState((prev) => ({ ...prev, accountId: e.target.value }))}
                placeholder="กรอก Account ID"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={formState.apiKey}
                onChange={(e) => setFormState((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="API Key"
              />
            </div>
            <div className="space-y-2">
              <Label>API Secret (ถ้ามี)</Label>
              <Input
                type="password"
                value={formState.apiSecret}
                onChange={(e) => setFormState((prev) => ({ ...prev, apiSecret: e.target.value }))}
                placeholder="API Secret"
              />
            </div>
            <div className="space-y-2">
              <Label>Access Token (ถ้ามี)</Label>
              <Input
                type="password"
                value={formState.accessToken}
                onChange={(e) => setFormState((prev) => ({ ...prev, accessToken: e.target.value }))}
                placeholder="Access Token"
              />
            </div>
            <div className="space-y-2">
              <Label>Refresh Token (ถ้ามี)</Label>
              <Input
                type="password"
                value={formState.refreshToken}
                onChange={(e) => setFormState((prev) => ({ ...prev, refreshToken: e.target.value }))}
                placeholder="Refresh Token"
              />
            </div>
            <div className="space-y-2">
              <Label>สกุลเงิน</Label>
              <Input
                value={formState.currency}
                onChange={(e) => setFormState((prev) => ({ ...prev, currency: e.target.value }))}
                placeholder="THB"
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={formState.timezone}
                onChange={(e) => setFormState((prev) => ({ ...prev, timezone: e.target.value }))}
                placeholder="Asia/Bangkok"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={formState.isActive}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isActive: Boolean(checked) }))
                }
              />
              <Label htmlFor="isActive">เปิดใช้งานบัญชี</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={formState.isDefault}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isDefault: Boolean(checked) }))
                }
              />
              <Label htmlFor="isDefault">ตั้งเป็น Default</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              บันทึกบัญชี
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
