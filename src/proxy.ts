import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Optimistic redirect for the admin area; real authorization happens in
// server components and actions (see requireVenueAccess).
export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
  });
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
