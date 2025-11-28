"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          // ตั้งค่า default: พื้นขาว / ขอบเทา / ยังไม่กำหนด text-color (ปล่อยให้คนใช้ใส่เอง)
          "flex h-10 w-full rounded-md border-2 border-gray-300 bg-white",
          "px-3 py-2 text-base placeholder:text-gray-500",
          "ring-offset-white focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
