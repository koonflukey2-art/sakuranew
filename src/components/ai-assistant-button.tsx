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
  DialogClose,
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
          <Bot className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Quick Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="
            max-w-md
            bg-slate-900 text-slate-100
            border border-slate-700 shadow-2xl
            backdrop-blur-md
            [&>button]:hidden
          "
        >
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Bot className="w-5 h-5 text-cyan-400" />
              AI Assistant
            </DialogTitle>

            {/* Custom Close Button */}
            <DialogClose
              className="
                inline-flex items-center justify-center
                rounded-full border border-slate-500
                p-1 text-slate-100
                hover:bg-slate-700 hover:text-white
                focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900
                transition
              "
            >
              <X className="w-4 h-4" />
            </DialogClose>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-slate-300">
              ผู้ช่วยอัจฉริยะพร้อมตอบคำถามเกี่ยวกับธุรกิจของคุณ
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="text-sm h-auto py-3 px-4 bg-slate-800 border border-slate-600 text-slate-100 hover:bg-slate-700 hover:border-cyan-400 transition rounded-xl"
                onClick={handleOpenFullPage}
              >
                สินค้าใกล้หมด?
              </Button>
              <Button
                variant="outline"
                className="text-sm h-auto py-3 px-4 bg-slate-800 border border-slate-600 text-slate-100 hover:bg-slate-700 hover:border-cyan-400 transition rounded-xl"
                onClick={handleOpenFullPage}
              >
                แคมเปญไหนดี?
              </Button>
              <Button
                variant="outline"
                className="text-sm h-auto py-3 px-4 bg-slate-800 border border-slate-600 text-slate-100 hover:bg-slate-700 hover:border-cyan-400 transition rounded-xl"
                onClick={handleOpenFullPage}
              >
                งบเหลือเท่าไหร่?
              </Button>
              <Button
                variant="outline"
                className="text-sm h-auto py-3 px-4 bg-slate-800 border border-slate-600 text-slate-100 hover:bg-slate-700 hover:border-cyan-400 transition rounded-xl"
                onClick={handleOpenFullPage}
              >
                วิเคราะห์ธุรกิจ
              </Button>
            </div>

            <Button
              onClick={handleOpenFullPage}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl shadow-lg"
            >
              เปิด AI Assistant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
