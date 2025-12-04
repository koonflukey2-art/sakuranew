// src/middleware.ts

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// กำหนด route ที่ "ไม่ต้อง" login
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',        // webhook ของ Clerk
  '/api/line/webhook(.*)',    // ✅ webhook ของ LINE ต้อง public
])

export default clerkMiddleware(async (auth, request) => {
  // ถ้าไม่ใช่ public route -> ต้อง auth
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
