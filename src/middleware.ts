import { NextResponse, type NextRequest } from "next/server";

/**
 * Route protection.
 *
 * The JWT cookie is verified on the edge of the app so unauthenticated requests
 * are redirected to sign-in before any page or data is rendered. Authorisation
 * of individual modules is enforced again inside each API route handler.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon.svg";

  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("msx_session")?.value;
  if (token) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
