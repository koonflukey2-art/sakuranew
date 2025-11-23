"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AIAssistantButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleOpenFullPage = () => {
    setIsOpen(false);
    router.push("/ai-assistant");
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Bot className="w-6 h-6" />
        </Button>
      </div>

      {/* Quick Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500" />
              AI Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-300">
              ผู้ช่วยอัจฉริยะพร้อมตอบคำถามเกี่ยวกับธุรกิจของคุณ
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="text-sm h-auto py-3"
                onClick={handleOpenFullPage}
              >
                สินค้าใกล้หมด?
              </Button>
              <Button
                variant="outline"
                className="text-sm h-auto py-3"
                onClick={handleOpenFullPage}
              >
                แคมเปญไหนดี?
              </Button>
              <Button
                variant="outline"
                className="text-sm h-auto py-3"
                onClick={handleOpenFullPage}
              >
                งบเหลือเท่าไหร่?
              </Button>
              <Button
                variant="outline"
                className="text-sm h-auto py-3"
                onClick={handleOpenFullPage}
              >
                วิเคราะห์ธุรกิจ
              </Button>
            </div>
            <Button
              onClick={handleOpenFullPage}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
            >
              เปิด AI Assistant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
