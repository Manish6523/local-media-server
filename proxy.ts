import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
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
  matcher: ["/"],
};
