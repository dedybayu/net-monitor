import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const response = NextResponse.next();
    const token = req.nextauth.token;
    const role = token?.role;
    const { pathname } = req.nextUrl;

    // --- CSRF Protection ---
    const csrfCookieName = 'x-csrf-token';
    let csrfToken = req.cookies.get(csrfCookieName)?.value;
    
    // Set CSRF token cookie if not present
    if (!csrfToken) {
      csrfToken = crypto.randomUUID();
      response.cookies.set(csrfCookieName, csrfToken, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: false, // Must be false so client JS can read it for fetch headers
      });
    }

    // Only protect Node/Service CRUD API routes for now
    const isNodeApiRoute = pathname.match(/^\/api\/workspaces\/\d+\/nodes/);
    if (isNodeApiRoute && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      const headerToken = req.headers.get('x-csrf-token');
      
      // Compare the token from the header with the token from the cookie
      if (!csrfToken || !headerToken || csrfToken !== headerToken) {
        return new NextResponse(
          JSON.stringify({ error: 'CSRF token mismatch or missing. Refresh the page.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    // --- End CSRF Protection ---

    // 1. Jika sudah login dan mencoba akses /login atau /register
    if (token && (pathname === "/login" || pathname === "/register")) {
      const redirectRes = NextResponse.redirect(new URL("/workspaces", req.url));
      // If a new CSRF token was generated, we should append it to the redirect response as well
      if (csrfToken) {
        redirectRes.cookies.set(csrfCookieName, csrfToken, {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          httpOnly: false,
        });
      }
      return redirectRes;
    }

    // 2. Jika mencoba akses dashboard tapi role-nya USR
    if (pathname.startsWith("/users") && role === "USR") {
      const redirectRes = NextResponse.redirect(new URL("/dashboard", req.url));
      if (csrfToken) {
        redirectRes.cookies.set(csrfCookieName, csrfToken, {
          path: '/',
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          httpOnly: false,
        });
      }
      return redirectRes;
    }

    return response;
  },
  {
    callbacks: {
      // authorized hanya mengembalikan true jika ada token
      // Namun, kita ingin halaman login/register bisa diakses publik (tanpa token)
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Biarkan akses tanpa login untuk /login dan /register
        if (pathname === "/login" || pathname === "/register") {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  // Tambahkan endpoint yang perlu diproses
  matcher: [
    "/users/:path*",
    "/info/:path*",
    "/login", 
    "/register", 
    "/workspaces/:path*",
    "/api/workspaces/:path*", // pastikan ini sesuai dengan path CRUD API kita
    "/api/workspace/:path*",
    "/api/proxmox/:path*",
  ],
};