"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// กำหนดสไตล์ของ input แต่ละ variant
const inputVariants = cva(
  "flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      // เพิ่ม / แก้ variant ที่นี่
      variant: {
        // ใช้ที่อื่น ๆ ในระบบ (โทนมืด)
        default:
          "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-400",

        // ใช้สำหรับช่องพิมพ์ใน AI Dialog (พื้นหลังขาว ตัวหนังสือดำ)
        ai:
          "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 ring-offset-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(inputVariants({ variant }), className)}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
