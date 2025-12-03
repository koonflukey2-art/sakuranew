"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export function UserSync() {
  const { user, isLoaded } = useUser();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    // อย่า sync ถ้า:
    // - clerk ยังไม่โหลด
    // - ยังไม่มี user
    // - sync ไปแล้วรอบหนึ่ง
    if (!isLoaded || !user || synced) return;

    let cancelled = false;

    const syncUser = async () => {
      try {
        const response = await fetch("/api/sync-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // body ไม่จำเป็น ถ้า backend ใช้ข้อมูลจาก Clerk auth เอาเอง
        });

        if (cancelled) return;

        if (response.ok) {
          console.log("✅ User synced with database");
          setSynced(true);
        } else {
          const text = await response.text().catch(() => "");
          console.error(
            "❌ Failed to sync user",
            response.status,
            response.statusText,
            text
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("❌ Sync error:", error);
        }
      }
    };

    syncUser();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, synced]);

  // component นี้ไม่ต้อง render อะไร
  return null;
}
