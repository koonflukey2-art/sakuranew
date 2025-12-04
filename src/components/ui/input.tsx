"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  // ใช้เลือกสไตล์ – "ai" เอาไว้ใช้กับช่องแชต AI
  variant?: "default" | "ai";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", variant = "default", style, ...props }, ref) => {
    const baseClasses =
      "flex h-10 w-full rounded-md border-2 px-3 py-2 text-base md:text-sm " +
      "disabled:cursor-not-allowed disabled:opacity-50 " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2";

    const variantClasses =
      variant === "ai"
        ? // โหมด AI: พื้นมืด ขอบเทา ตัวอักษรขาว
          "border-slate-700 bg-slate-900 text-white placeholder:text-slate-400 ring-offset-slate-900"
        : // โหมดทั่วไป
          "border-gray-300 bg-white text-gray-900 font-medium placeholder:text-gray-500 ring-offset-white";

    // โหมด AI บังคับสีตัวหนังสือด้วย inline style (แรงสุด)
    const finalStyle =
      variant === "ai"
        ? ({
            color: "#ffffff",
            WebkitTextFillColor: "#ffffff",
            ...style,
          } as React.CSSProperties)
        : style;

    return (
      <input
        ref={ref}
        type={type}
        className={cn(baseClasses, variantClasses, className)}
        style={finalStyle}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
