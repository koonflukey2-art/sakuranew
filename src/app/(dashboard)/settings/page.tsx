"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  User,
  Key,
  Bell,
  Globe,
  Eye,
  EyeOff,
  Lock,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();

  // Profile state
  const [name, setName] = useState("Admin User");
  const [email] = useState("admin@test.com");
  const [role] = useState("ADMIN");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // API Keys state
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [n8nUrl, setN8nUrl] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showN8n, setShowN8n] = useState(false);

  // Notifications state
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [budgetAlert, setBudgetAlert] = useState(true);
  const [campaignAlert, setCampaignAlert] = useState(false);

  // General state
  const [currency, setCurrency] = useState("THB");
  const [language, setLanguage] = useState("th");
  const [timezone, setTimezone] = useState("Asia/Bangkok");

  const handleUpdateProfile = () => {
    toast({
      title: "อัปเดตโปรไฟล์สำเร็จ",
      description: "ข้อมูลโปรไฟล์ของคุณได้รับการอัปเดตแล้ว",
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบ",
        description: "โปรดกรอกรหัสผ่านทุกช่อง",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "กรุณาตรวจสอบรหัสผ่านใหม่",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "เปลี่ยนรหัสผ่านสำเร็จ",
      description: "รหัสผ่านของคุณได้รับการเปลี่ยนแปลงแล้ว",
    });

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSaveAPIKeys = () => {
    toast({
      title: "บันทึก API Keys สำเร็จ",
      description: "การตั้งค่า API Keys ได้รับการบันทึกแล้ว",
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: "บันทึกการแจ้งเตือนสำเร็จ",
      description: "การตั้งค่าการแจ้งเตือนได้รับการบันทึกแล้ว",
    });
  };

  const handleSaveGeneral = () => {
    toast({
      title: "บันทึกการตั้งค่าทั่วไปสำเร็จ",
      description: "การตั้งค่าทั่วไปได้รับการบันทึกแล้ว",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่า</h1>
        <p className="text-muted-foreground">จัดการโปรไฟล์และการตั้งค่าระบบ</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            โปรไฟล์
          </TabsTrigger>
          <TabsTrigger value="api">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            การแจ้งเตือน
          </TabsTrigger>
          <TabsTrigger value="general">
            <Globe className="h-4 w-4 mr-2" />
            ทั่วไป
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลส่วนตัว</CardTitle>
              <CardDescription>อัปเดตข้อมูลโปรไฟล์ของคุณ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อของคุณ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input id="email" value={email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  ไม่สามารถเปลี่ยนอีเมลได้
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">บทบาท</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{role}</Badge>
                </div>
              </div>

              <Button onClick={handleUpdateProfile}>
                <Save className="h-4 w-4 mr-2" />
                บันทึกโปรไฟล์
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>เปลี่ยนรหัสผ่าน</CardTitle>
              <CardDescription>อัปเดตรหัสผ่านของคุณ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="รหัสผ่านปัจจุบัน"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="รหัสผ่านใหม่"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="ยืนยันรหัสผ่านใหม่"
                />
              </div>

              <Button onClick={handleChangePassword}>
                <Lock className="h-4 w-4 mr-2" />
                เปลี่ยนรหัสผ่าน
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gemini API Key</CardTitle>
              <CardDescription>API Key สำหรับ Google Gemini AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type={showGemini ? "text" : "password"}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowGemini(!showGemini)}
                >
                  {showGemini ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>OpenAI API Key</CardTitle>
              <CardDescription>API Key สำหรับ OpenAI GPT (Optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type={showOpenAI ? "text" : "password"}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowOpenAI(!showOpenAI)}
                >
                  {showOpenAI ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>n8n Webhook URL</CardTitle>
              <CardDescription>URL สำหรับ Automation Workflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type={showN8n ? "text" : "password"}
                  value={n8nUrl}
                  onChange={(e) => setN8nUrl(e.target.value)}
                  placeholder="https://n8n.example.com/webhook/..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowN8n(!showN8n)}
                >
                  {showN8n ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveAPIKeys}>
              <Save className="h-4 w-4 mr-2" />
              บันทึก API Keys
            </Button>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>การแจ้งเตือน</CardTitle>
              <CardDescription>
                จัดการการแจ้งเตือนที่คุณต้องการรับ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="lowStock">แจ้งเตือนสินค้าใกล้หมด</Label>
                  <p className="text-sm text-muted-foreground">
                    รับการแจ้งเตือนเมื่อสินค้าต่ำกว่าระดับขั้นต่ำ
                  </p>
                </div>
                <Switch
                  id="lowStock"
                  checked={lowStockAlert}
                  onCheckedChange={setLowStockAlert}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="budget">แจ้งเตือนงบประมาณ</Label>
                  <p className="text-sm text-muted-foreground">
                    รับการแจ้งเตือนเมื่อใช้งบประมาณเกิน 80%
                  </p>
                </div>
                <Switch
                  id="budget"
                  checked={budgetAlert}
                  onCheckedChange={setBudgetAlert}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="campaign">แจ้งเตือนแคมเปญ</Label>
                  <p className="text-sm text-muted-foreground">
                    รับการแจ้งเตือนเกี่ยวกับสถานะแคมเปญโฆษณา
                  </p>
                </div>
                <Switch
                  id="campaign"
                  checked={campaignAlert}
                  onCheckedChange={setCampaignAlert}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveNotifications}>
              <Save className="h-4 w-4 mr-2" />
              บันทึกการแจ้งเตือน
            </Button>
          </div>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>การตั้งค่าทั่วไป</CardTitle>
              <CardDescription>จัดการการตั้งค่าระบบทั่วไป</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currency">สกุลเงิน</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THB">บาทไทย (THB)</SelectItem>
                    <SelectItem value="USD">ดอลลาร์สหรัฐ (USD)</SelectItem>
                    <SelectItem value="EUR">ยูโร (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">ภาษา</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="th">ไทย</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">เขตเวลา</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Bangkok">
                      Asia/Bangkok (GMT+7)
                    </SelectItem>
                    <SelectItem value="America/New_York">
                      America/New York (GMT-5)
                    </SelectItem>
                    <SelectItem value="Europe/London">
                      Europe/London (GMT+0)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveGeneral}>
              <Save className="h-4 w-4 mr-2" />
              บันทึกการตั้งค่าทั่วไป
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
