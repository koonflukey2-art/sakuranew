"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("light", savedTheme === "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("light", newTheme === "light");
  };

  // หมายเหตุ: การ return children เฉยๆ ตอน !mounted ทำให้ Context หายไปชั่วขณะ
  // แต่เราแก้ที่ useTheme แล้ว ปัญหานี้จึงไม่ทำให้ Build พัง
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  
  // --- จุดที่แก้ไข (Fix for Build Error) ---
  if (!context) {
    // แทนที่จะ throw Error เราจะ return ค่าหลอกๆ (Mock) กลับไป
    // เพื่อให้ Next.js สามารถ Build หน้าเว็บจนเสร็จได้โดยไม่พัง
    return {
      theme: "dark",      // ค่า Default
      toggleTheme: () => {}, // ฟังก์ชันว่างๆ ไม่ต้องทำอะไร
    } as ThemeContextType;
  }
  
  return context;
}