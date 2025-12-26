import { redirect } from "next/navigation";

export default function RootPage() {
  // Simple redirect to sign-in
  // Middleware will handle the rest:
  // - If user is logged in, middleware redirects to /dashboard
  // - If user is not logged in, they see /auth/sign-in
  redirect("/auth/sign-in");
}
