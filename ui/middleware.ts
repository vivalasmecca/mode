import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (process.env.VERCEL && !process.env.ADMIN_KEY) {
      return new Response("Admin routes are only available in local development.", { status: 403 });
    }
    return NextResponse.next();
  }
}

export const config = { matcher: ["/", "/admin/:path*"] };
