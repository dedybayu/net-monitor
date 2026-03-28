import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role;
    const { pathname } = req.nextUrl;

    // 1. Jika sudah login dan mencoba akses /login atau /register
    if (token && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 2. Jika mencoba akses dashboard tapi role-nya USR
    if (pathname.startsWith("/dashboard") && role === "USR") {
      return NextResponse.redirect(new URL("/info", req.url));
    }
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
  // Tambahkan /login dan /register ke dalam matcher agar diproses middleware
  matcher: ["/dashboard/:path*", "/info/:path*", "/login", "/register"],
};