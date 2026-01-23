"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          เกิดข้อผิดพลาด!
        </h2>
        <p className="text-slate-400 mb-6">
          {error.message || "Something went wrong"}
        </p>
        <Button onClick={() => reset()}>ลองอีกครั้ง</Button>
      </div>
    </div>
  );
}
