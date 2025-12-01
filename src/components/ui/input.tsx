"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  // ใช้เลือกสไตล์ – "ai" จะเอาไปใช้เฉพาะช่องของ AI Assistant
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
        ? // ใช้กับ AI Assistant: พื้นมืด ขอบชมพู
          "border-slate-700 bg-slate-900 placeholder:text-slate-400 ring-offset-slate-900"
        : // ใช้ทั่วไป: พื้นขาว ตัวดำ
          "border-gray-300 bg-white text-gray-900 font-medium placeholder:text-gray-500 ring-offset-white";

    // ถ้าเป็น variant="ai" ให้บังคับสีตัวหนังสือด้วย inline style (ชนะทุก class)
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
