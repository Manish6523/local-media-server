import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // --- CORS Logic for API routes ---
  if (request.nextUrl.pathname.startsWith("/api")) {
    const origin = request.headers.get("origin") || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Range",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
      "Access-Control-Allow-Credentials": "true",
    };

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { headers: corsHeaders, status: 200 });
    }

    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // --- Redirect Logic for Root ---
  // Only redirect the root path — don't redirect API routes, /tv, or other pages
  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  var ua = request.headers.get("user-agent") || "";

  // Detect LG webOS / NetCast / old Smart TV browsers
  if (ua.indexOf("Web0S") !== -1 || ua.indexOf("NetCast") !== -1) {
    return NextResponse.redirect(new URL("/tv", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/api/:path*"],
};
