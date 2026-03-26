"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

type ThemeMode = "auto" | "light" | "dark"

export default function Navbar() {
  const pathname = usePathname() // Ambil path saat ini
  const isLoginPage = pathname === "/login"
  const [theme, setTheme] = useState<ThemeMode>("auto")
  const [mounted, setMounted] = useState(false)

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
              <span className="btn btn-ghost text-2xl font-extrabold">Gawean</span>
            </Link>
          </div>

          <div className="navbar-center hidden lg:flex">
            <ul className="menu menu-horizontal gap-6 text-lg font-semibold">
              <li><Link href="/#home">Beranda</Link></li>
              <li><Link href="/#features">Fitur Kami</Link></li>
              <li><Link href="/#about">Tentang Kami</Link></li>
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
                  Mlebu
                </button>
              </Link>
            )}
          </div>
        </nav>
      </div>

      <div className="drawer-side z-[60]">
        <label htmlFor="mobile-drawer" className="drawer-overlay"></label>
        <aside className="menu p-6 w-64 min-h-full bg-base-200 text-base-content">
          <h2 className="text-xl font-bold mb-6">Gawean</h2>
          <ul className="space-y-2 text-lg font-semibold">
            <li><Link href="/#home">Beranda</Link></li>
            <li><Link href="/#features">Fitur Kami</Link></li>
            <li><Link href="/#about">Tentang Kami</Link></li>
          </ul>
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