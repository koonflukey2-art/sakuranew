"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("❌ Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />

        <h2 className="text-2xl font-bold text-white mb-2">
          เกิดข้อผิดพลาด!
        </h2>

        <p className="text-slate-400 mb-6">
          {error.message || "Something went wrong. Please try again."}
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => reset()}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500"
          >
            ลองอีกครั้ง
          </Button>

          <Button
            onClick={() => window.location.href = "/"}
            variant="outline"
            className="w-full"
          >
            กลับหน้าหลัก
          </Button>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-400">
              Debug Info
            </summary>
            <pre className="mt-2 text-xs text-red-400 bg-slate-900 p-3 rounded overflow-auto max-h-40">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
