"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);

    // Simulate registration (replace with actual API call)
    await new Promise((r) => setTimeout(r, 1500));

    // Redirect to login
    window.location.href = "/login";
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-white">สมัครสมาชิก</CardTitle>
        <CardDescription className="text-slate-300">สร้างบัญชีใหม่เพื่อเริ่มใช้งาน</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-white">ชื่อ</Label>
            <Input type="text" placeholder="ชื่อของคุณ" value={name} onChange={(e) => setName(e.target.value)} required className="bg-white/10 border-white/20 text-white placeholder:text-slate-400" />
          </div>

          <div className="space-y-2">
            <Label className="text-white">อีเมล</Label>
            <Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-white/10 border-white/20 text-white placeholder:text-slate-400" />
          </div>

          <div className="space-y-2">
            <Label className="text-white">รหัสผ่าน</Label>
            <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-white/10 border-white/20 text-white placeholder:text-slate-400" />
          </div>

          <div className="space-y-2">
            <Label className="text-white">ยืนยันรหัสผ่าน</Label>
            <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="bg-white/10 border-white/20 text-white placeholder:text-slate-400" />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            สมัครสมาชิก
          </Button>

          <p className="text-center text-sm text-slate-300">
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="text-emerald-400 hover:underline">เข้าสู่ระบบ</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
