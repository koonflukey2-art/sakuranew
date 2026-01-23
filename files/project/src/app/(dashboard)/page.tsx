import { redirect } from "next/navigation";

export default function DashboardPage() {
  // เมื่อมีคนเข้า route นี้ ให้เด้งไปหน้า /dashboard ทันที
  redirect("/dashboard");
}
