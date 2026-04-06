"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react";


type ThemeMode = "auto" | "light" | "dark"

export default function Navbar() {
  const pathname = usePathname() // Ambil path saat ini
  const isLoginPage = pathname === "/login"
  const [theme, setTheme] = useState<ThemeMode>("auto")
  const [mounted, setMounted] = useState(false)

  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const applyTheme = useCallback((mode: ThemeMode) => {
    if (typeof window === "undefined") return

    let targetTheme = mode
    if (mode === "auto") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      targetTheme = isDark ? "dark" : "light"
    }
    document.documentElement.setAttribute("data-theme", targetTheme)
  }, [])

  /* ---------- HYDRATION & INITIAL LOAD ---------- */
  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemeMode
    if (stored && (stored === "light" || stored === "dark" || stored === "auto")) {
      setTheme(stored)
      applyTheme(stored)
    } else {
      applyTheme("auto")
    }

    setMounted(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- SYNC THEME CHANGES ---------- */
  useEffect(() => {
    if (!mounted) return

    applyTheme(theme)
    localStorage.setItem("theme", theme)
  }, [theme, mounted, applyTheme])

  const toggleTheme = () => {
    const modes: ThemeMode[] = ["auto", "light", "dark"]
    const currentIndex = modes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % modes.length
    setTheme(modes[nextIndex])
  }

  return (
    <div className="drawer">
      <input id="mobile-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content">
        <nav className="navbar fixed top-0 left-0 w-full z-50 bg-base-100 shadow-sm px-4">
          <div className="navbar-start">
            <label htmlFor="mobile-drawer" className="btn btn-ghost btn-circle lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
            <Link href="/">
              <span className="btn btn-ghost text-2xl font-extrabold">NetMonitor SIDEBAR</span>
            </Link>
          </div>

          <div className="navbar-center hidden lg:flex">
            <ul className="menu menu-horizontal gap-6 text-lg font-semibold">
               {isLoggedIn ? (
                <>
                  <li><Link href="/workspaces">Workspace</Link></li>
                  <li><Link href="/proxmox">Proxmox</Link></li>
                  <li><Link href="/#about">Tentang Kami</Link></li>
                </>
              ) : (
                <>
                  <li><Link href="/#home">Beranda</Link></li>
                  <li><Link href="/#features">Fitur Kami</Link></li>
                  <li><Link href="/#about">Tentang Kami</Link></li>
                </>
              )}
            </ul>
          </div>

          <div className="navbar-end gap-2">
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-circle"
              title={mounted ? `Mode: ${theme}` : "Theme Toggle"}
            >
              {mounted ? <ThemeIcon mode={theme} /> : <div className="w-6 h-6" />}
            </button>

            {!isLoginPage && (
              <Link href="/login">
                <button className="btn btn-primary btn-sm font-semibold hidden sm:inline-flex">
                  Masuk
                </button>
              </Link>
            )}
          </div>
        </nav>
      </div>

      <div className="drawer-side z-[60]">
        <label htmlFor="mobile-drawer" className="drawer-overlay"></label>
        <aside className="w-64 min-h-full bg-base-200 text-base-content flex flex-col justify-between">
          {/* BAGIAN ATAS (MENU) */}
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6">NetMonitor</h2>
            <ul className="menu p-0 space-y-2 text-lg font-semibold">
              {isLoggedIn ? (
                <>
                  <li><Link href="/workspaces">Workspace</Link></li>
                  <li><Link href="/proxmox">Proxmox</Link></li>
                  <li><Link href="/#about">Tentang Kami</Link></li>
                </>
              ) : (
                <>
                  <li><Link href="/#home">Beranda</Link></li>
                  <li><Link href="/#features">Fitur Kami</Link></li>
                  <li><Link href="/#about">Tentang Kami</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* BAGIAN BAWAH (PROFILE) */}
          {isLoggedIn ? (
            <div className="p-4 border-t border-base-300 bg-base-300/30">
              <div className="flex items-center gap-3 p-2 rounded-2xl transition-colors hover:bg-base-300">
                <div className="avatar placeholder">
                  {/* Ganti div lama dengan struktur ini */}
                  <div className="rounded-xl w-10 h-10 ring-1 ring-base-content/10 ring-offset-base-100 ring-offset-2">
                    <img
                      src="https://i.pravatar.cc/150?u=dedybayu" // URL gambar dummy acak
                      alt="Dedy Bayu Profile"
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black leading-none uppercase tracking-tighter">Dedy Bayu</span>
                  <span className="text-[10px] opacity-50 font-bold mt-1 uppercase tracking-widest">Administrator</span>
                </div>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="btn btn-ghost btn-sm w-full mt-4 text-error font-bold uppercase text-[10px] tracking-widest hover:bg-error/10">
                Logout
              </button>
            </div>
          ) : (
            /* TAMPILKAN TOMBOL LOGIN JIKA BELUM AUTH */
            <div className="p-6 border-t border-base-300">
              <Link href="/login" className="btn btn-primary btn-sm w-full font-black uppercase text-[10px] tracking-widest">
                LogIn
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      {mode === "light" && <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 6a6 6 0 100 12 6 6 0 000-12z" />}
      {mode === "dark" && <path d="M21 12.79A9 9 0 0111.21 3 7 7 0 1019 14.79z" />}
      {mode === "auto" && <text x="50%" y="65%" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">A</text>}
    </svg>
  )
}