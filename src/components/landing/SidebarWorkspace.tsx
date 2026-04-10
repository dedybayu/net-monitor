"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

type ThemeMode = "auto" | "light" | "dark"

export default function Navbar() {
  const pathname = usePathname()
  const params = useParams() // Ambil params dari URL
  const workspaceId = params.workspace_id // Ambil workspace_id dari URL [workspace_id]


  // const pathname = usePathname()
  const isLoginPage = pathname === "/login"
  const [theme, setTheme] = useState<ThemeMode>("auto")
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const { data: session, status } = useSession()
  const isLoggedIn = status === "authenticated"

  const applyTheme = useCallback((mode: ThemeMode) => {
    if (typeof window === "undefined") return
    let targetTheme = mode
    if (mode === "auto") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      targetTheme = isDark ? "dark" : "light"
    }
    document.documentElement.setAttribute("data-theme", targetTheme)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem("theme") as ThemeMode
    if (stored && ["light", "dark", "auto"].includes(stored)) {
      setTheme(stored)
      applyTheme(stored)
    } else {
      applyTheme("auto")
    }
    setMounted(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
    localStorage.setItem("theme", theme)
  }, [theme, mounted, applyTheme])

  const toggleTheme = () => {
    const modes: ThemeMode[] = ["auto", "light", "dark"]
    const currentIndex = modes.indexOf(theme)
    setTheme(modes[(currentIndex + 1) % modes.length])
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await signOut({ callbackUrl: "/" })
  }

  return (
    <>
      {/* ── SIDEBAR ──────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-50
          bg-base-200 text-base-content flex flex-col justify-between
          shadow-xl transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div>
          <div className="p-6 border-b border-base-300">
            <Link href="" onClick={() => setSidebarOpen(false)}>
              <span className="text-xl font-extrabold tracking-tight">NetMonitor</span>
            </Link>
          </div>

          <ul className="menu p-4 space-y-1 text-base font-semibold">
                <li><Link href={`/workspaces/${workspaceId}/dashboard`} onClick={() => setSidebarOpen(false)}><DashboardIcon /> Dasboard</Link></li>
                <li><Link href={`/workspaces/${workspaceId}/topology`} onClick={() => setSidebarOpen(false)}><TopologyIcon /> Topology</Link></li>
                <li><Link href={`/workspaces/${workspaceId}/proxmox`} onClick={() => setSidebarOpen(false)}><ProxmoxIcon /> Proxmox</Link></li>
          </ul>
        </div>

        {/* Profile / Login di bawah */}
        {isLoggedIn ? (
          <div className="p-4 border-t border-base-300 bg-base-300/30">
            <div className="flex items-center gap-3 p-2 rounded-2xl transition-colors hover:bg-base-300">
              <div className="avatar placeholder">
                <div className="rounded-xl w-10 h-10 ring-1 ring-base-content/10 ring-offset-base-100 ring-offset-2">
                  <img src="https://i.pravatar.cc/150?u=dedybayu" alt="Dedy Bayu Profile" className="object-cover" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black leading-none uppercase tracking-tighter">Dedy Bayu</span>
                <span className="text-[10px] opacity-50 font-bold mt-1 uppercase tracking-widest">Administrator</span>
              </div>
            </div>
            <button
              onClick={() => setLogoutModalOpen(true)}
              className="btn btn-ghost btn-sm w-full mt-4 text-error font-bold uppercase text-[10px] tracking-widest hover:bg-error/10"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="p-6 border-t border-base-300">
            <Link href="/login" className="btn btn-primary btn-sm w-full font-black uppercase text-[10px] tracking-widest">
              Login
            </Link>
          </div>
        )}
      </aside>

      {/* ── TOP NAVBAR ───────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 lg:left-64 z-30 bg-base-100 shadow-sm px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="btn btn-ghost btn-circle lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-lg font-bold tracking-tight">NetMonitor</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-circle"
            title={mounted ? `Mode: ${theme}` : "Theme Toggle"}
          >
            {mounted ? <ThemeIcon mode={theme} /> : <div className="w-6 h-6" />}
          </button>

          {isLoggedIn ? (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="w-9 rounded-full ring-1 ring-base-content/10 ring-offset-1 ring-offset-base-100">
                  <img src="https://i.pravatar.cc/150?u=dedybayu" alt="Dedy Bayu" />
                </div>
              </div>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-48">
                <li className="menu-title">
                  <span className="font-black uppercase tracking-widest text-[10px]">Dedy Bayu</span>
                </li>
                <li>
                  <button onClick={() => setLogoutModalOpen(true)} className="text-error font-semibold">
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            !isLoginPage && (
              <Link href="/login">
                <button className="btn btn-primary btn-sm font-semibold">Masuk</button>
              </Link>
            )
          )}
        </div>
      </nav>

      {/* ── LOGOUT CONFIRMATION MODAL ────────────────────── */}
      {logoutModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={() => { if (!isLoggingOut) setLogoutModalOpen(false) }}
          />

          {/* Panel */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-sm bg-base-100 rounded-3xl border border-base-300 shadow-2xl overflow-hidden"
              style={{ animation: "modalPop 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
            >
              {/* Icon */}
              <div className="flex flex-col items-center pt-8 pb-4 px-8">
                <div className="relative mb-5">
                  <div className="h-16 w-16 rounded-2xl bg-error/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                  </div>
                  {/* Ping ring */}
                  <div className="absolute -inset-1 rounded-2xl border border-error/20 animate-ping" />
                </div>

                <h3 className="text-xl font-black tracking-tight text-center">Keluar dari Akun?</h3>
                <p className="text-sm text-base-content/50 text-center mt-2 leading-relaxed">
                  Sesi kamu akan diakhiri. Kamu perlu login kembali untuk mengakses dashboard.
                </p>
              </div>

              {/* User info strip */}
              <div className="mx-6 mb-6 flex items-center gap-3 p-3 rounded-2xl bg-base-200 border border-base-300">
                <div className="rounded-xl w-9 h-9 overflow-hidden ring-1 ring-base-content/10 flex-shrink-0">
                  <img src="https://i.pravatar.cc/150?u=dedybayu" alt="Profile" className="object-cover w-full h-full" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black leading-none uppercase tracking-tighter truncate">Dedy Bayu</span>
                  <span className="text-[10px] opacity-40 font-bold mt-0.5 uppercase tracking-widest">Administrator</span>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
                    Aktif
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setLogoutModalOpen(false)}
                  disabled={isLoggingOut}
                  className="btn btn-ghost flex-1 rounded-2xl font-bold border border-base-300 disabled:opacity-40"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="btn btn-error flex-1 rounded-2xl font-bold text-white disabled:opacity-60"
                >
                  {isLoggingOut ? (
                    <span className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-xs" />
                      Keluar...
                    </span>
                  ) : "Ya, Keluar"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </>
  )
}

/* ── Icon helpers ────────────────────────────────────────── */

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      {mode === "light" && <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 6a6 6 0 100 12 6 6 0 000-12z" />}
      {mode === "dark" && <path d="M21 12.79A9 9 0 0111.21 3 7 7 0 1019 14.79z" />}
      {mode === "auto" && <text x="50%" y="65%" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">A</text>}
    </svg>
  )
}
function HomeIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12L12 3l9 9M4 10v10a1 1 0 001 1h5v-6h4v6h5a1 1 0 001-1V10" /></svg>
}
function StarIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
}
function InfoIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
}
function WorkspaceIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
}
function ServerIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
}

// Dashboard Icon
function DashboardIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
}

// Proxmox Icon
function ProxmoxIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16v16H4V4z" /><path d="M8 8h8v8H8V8z" /></svg>
}

// Topology Icon
function TopologyIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM8 12h.01M12 12h.01M16 12h.01M9 16h6m-3-3v6" /></svg>
}