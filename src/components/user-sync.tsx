"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export function UserSync() {
  const { user, isLoaded } = useUser();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      if (!isLoaded || !user || synced) return;

      try {
        const response = await fetch("/api/sync-user", {
          method: "POST",
        });

        if (response.ok) {
          console.log("✅ User synced with database");
          setSynced(true);
        } else {
          console.error("❌ Failed to sync user");
        }
      } catch (error) {
        console.error("❌ Sync error:", error);
      }
    };

    syncUser();
  }, [isLoaded, user, synced]);

  return null; // This component doesn't render anything
}
