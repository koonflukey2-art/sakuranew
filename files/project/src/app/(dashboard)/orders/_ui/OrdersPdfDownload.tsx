"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function OrdersPdfDownload() {
  const { toast } = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [downloading, setDownloading] = useState(false);

  const onDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/orders/report/pdf?date=${date}`, { credentials: "include" });

      if (!res.ok) {
        let msg = `Download failed (${res.status})`;
        try {
          const j = await res.json();
          msg = j?.error || j?.message || msg;
        } catch {}

        if (res.status === 401) {
          toast({
            variant: "destructive",
            title: "ยังไม่ได้ล็อกอิน / session หมดอายุ",
            description: "กรุณารีเฟรชหน้าแล้วล็อกอินใหม่ จากนั้นลองดาวน์โหลดอีกครั้ง",
          });
          return;
        }

        toast({
          variant: "destructive",
          title: "ดาวน์โหลดไม่สำเร็จ",
          description: msg,
        });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      toast({
        title: "กำลังดาวน์โหลด",
        description: `orders-${date}.pdf`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: e?.message || "unknown error",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="grid gap-1">
        <label className="text-xs text-muted-foreground">Report date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-md border px-2 text-sm bg-background"
        />
      </div>

      <Button onClick={onDownload} disabled={downloading}>
        {downloading ? "Generating…" : "Download PDF"}
      </Button>
    </div>
  );
}
