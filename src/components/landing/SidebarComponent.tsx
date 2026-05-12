"use client"

import { useEffect, useState, useCallback, ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

export type ThemeMode = "auto" | "light" | "dark"

export interface MenuItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export default function SidebarComponent({ menuItems }: { menuItems: MenuItem[] }) {
  const pathname = usePathname()
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
      {/* ── SIDEBAR BACKDROP (Mobile) ──────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR PANEL ──────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-72 z-50
          bg-base-100 border-r border-base-200 flex flex-col justify-between
          shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden p-4 pb-0 no-scrollbar">

          {/* Logo Brand */}
          <div className="mb-6 px-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <svg className="w-5 h-5 text-primary-content" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-base-content to-base-content/60">
                NetMonitor
              </h1>
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-40">Workspace</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="flex-1 space-y-1">
            <p className="text-[10px] font-black tracking-[0.2em] uppercase opacity-30 px-4 mb-3 mt-4">Menu Utama</p>
            <ul className="flex flex-col space-y-1">
              {menuItems.map((item, idx) => {
                const isActive = pathname === item.href
                return (
                  <li key={idx}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20
                            ${isActive ? 'bg-primary/10 text-primary shadow-sm' : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'}`}
                    >
                      <div className={`p-1.5 rounded-xl transition-all duration-300 shrink-0 
                                ${isActive ? 'bg-primary/20 text-primary scale-110 shadow-inner' : 'bg-base-200/50 text-base-content/50 group-hover:bg-base-300 group-hover:text-base-content group-hover:scale-110'}`}>
                        {item.icon}
                      </div>
                      <span className="text-sm tracking-tight">{item.label}</span>
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--p),1)]"></div>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {/* Profile / Bottom Section */}
        <div className="p-4 mt-auto">
          {isLoggedIn ? (
            <div className="bg-base-200/50 border border-base-200 rounded-[1.5rem] p-3 transition-colors hover:bg-base-200 group">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative shrink-0">
                  <img src="https://i.pravatar.cc/150?u=dedybayu" alt="Profile" className="w-10 h-10 rounded-xl object-cover ring-2 ring-base-100 shadow-sm" />
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-base-100"></span>
                </div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-sm font-black leading-none tracking-tight truncate">Dedy Bayu</span>
                  <span className="text-[10px] font-bold text-base-content/40 mt-1 uppercase tracking-widest truncate">Administrator</span>
                </div>
              </div>
              <button
                onClick={() => setLogoutModalOpen(true)}
                className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-error/80 bg-error/10 hover:bg-error hover:text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-error/20"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary w-full rounded-2xl font-black uppercase tracking-widest shadow-sm shadow-primary/20">
              Sign In <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </Link>
          )}
        </div>
      </aside>

      {/* ── TOP NAVBAR ───────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 lg:left-72 z-30 h-20 flex items-center justify-between px-6 pointer-events-none">
        {/* Left Side (Appears only on mobile as background block) */}
        {!isLoginPage && (
          <div className="absolute inset-0 bg-base-100/80 backdrop-blur-xl border-b border-base-200 lg:hidden pointer-events-auto"></div>
        )}

        <div className="relative z-10 flex items-center gap-3 pointer-events-auto">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-base-100 border border-base-200 shadow-sm text-base-content/70 hover:text-primary transition-colors lg:hidden focus:outline-none focus:ring-2 focus:ring-primary/20"
            onClick={() => setSidebarOpen(true)}
            aria-label="Toggle Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </button>
        </div>

        {/* Right Side Tools */}
        <div className="relative z-10 flex items-center gap-2 pointer-events-auto bg-base-100/90 backdrop-blur-md px-3 py-2 rounded-3xl border border-base-200 shadow-sm">

          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-base-200/50 hover:bg-base-200 text-base-content/60 transition-colors focus:outline-none focus:ring-2 focus:ring-base-content/10"
            title={mounted ? `Current Mode: ${theme}` : "Theme Toggle"}
          >
            {mounted ? <ThemeIcon mode={theme} /> : <div className="w-5 h-5" />}
          </button>

          {isLoggedIn ? (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="w-10 h-10 rounded-full overflow-hidden border-2 border-base-100 ring-1 ring-base-200 transition-transform active:scale-95 focus:outline-none">
                <img src="https://i.pravatar.cc/150?u=dedybayu" alt="Dedy Bayu" className="object-cover w-full h-full" />
              </div>
              <ul tabIndex={0} className="mt-4 p-2 shadow-2xl menu menu-sm dropdown-content bg-base-100 border border-base-200 rounded-[1.5rem] w-52 z-50">
                <li className="px-4 py-3 border-b border-base-200/50 mb-1">
                  <span className="font-black tracking-tight text-sm text-base-content block leading-none">Dedy Bayu</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-1">Admin</span>
                </li>
                <li>
                  <Link href="/profile" className="font-semibold px-4 py-2 hover:bg-base-200">
                    Profile Settings
                  </Link>
                </li>
                <li>
                  <button onClick={() => setLogoutModalOpen(true)} className="font-black text-error px-4 py-2 hover:bg-error/10">
                    Sign Out
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            !isLoginPage && (
              <Link href="/login" className="btn btn-primary btn-sm rounded-full px-5 shadow-sm font-bold tracking-tight">
                Sign In
              </Link>
            )
          )}
        </div>
      </nav>

      {/* ── LOGOUT CONFIRMATION MODAL ────────────────────── */}
      {logoutModalOpen && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md transition-all"
            onClick={() => { if (!isLoggingOut) setLogoutModalOpen(false) }}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-sm bg-base-100 rounded-[2rem] border border-base-200 shadow-2xl p-1 shadow-black/20"
              style={{ animation: "modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
              <div className="bg-base-200/30 rounded-[1.75rem] overflow-hidden p-6 text-center">
                <div className="relative inline-flex mb-4">
                  <div className="w-16 h-16 rounded-[1.25rem] bg-error/10 flex items-center justify-center text-error border border-error/10">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-xl font-black tracking-tight mb-2">Mengakhiri Sesi</h3>
                <p className="text-xs font-medium text-base-content/60 leading-relaxed mb-6">
                  Anda akan disconect dari dashboard workspace. Anda butuh verifikasi ulang untuk masuk nanti.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setLogoutModalOpen(false)}
                    disabled={isLoggingOut}
                    className="btn btn-ghost flex-1 rounded-[1rem] bg-base-200 hover:bg-base-300 font-bold border-none"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="btn btn-error flex-1 rounded-[1rem] font-black text-white border-none shadow-lg shadow-error/20"
                  >
                    {isLoggingOut ? <span className="loading loading-spinner loading-sm"></span> : "Sign Out"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </>
  )
}

/* ── Icon helpers ────────────────────────────────────────── */

export function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      {mode === "light" && <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 6a6 6 0 100 12 6 6 0 000-12z" />}
      {mode === "dark" && <path d="M21 12.79A9 9 0 0111.21 3 7 7 0 1019 14.79z" />}
      {mode === "auto" && <text x="50%" y="65%" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">A</text>}
    </svg>
  )
}
export function HomeIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12L12 3l9 9M4 10v10a1 1 0 001 1h5v-6h4v6h5a1 1 0 001-1V10" /></svg>
}
export function StarIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
}
export function InfoIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
}
export function WorkspaceIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
}
export function ServerIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
}

// Dashboard Icon
export function DashboardIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
}

// Proxmox Icon
export function ProxmoxIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
}

// Topology Icon
export function TopologyIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.5" y1="10.5" x2="15.5" y2="6.5" /><line x1="8.5" y1="13.5" x2="15.5" y2="17.5" /></svg>
}

// node icon
export function NodeIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
}

export function ResourcesIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
}

export function TaskIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 14l2 2 4-4" /></svg>
}

export function VMIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
}

export function CTIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m10 13-2 3 2 3" /><path d="m14 13 2 3-2 3" /><rect x="2" y="3" width="20" height="14" rx="2" /></svg>
}

export function SnmpIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8a6 6 0 0 1 0 8.4" /><path d="M7.8 16.2a6 6 0 0 1 0-8.4" /><path d="M19.8 4.2a11 11 0 0 1 0 15.6" /><path d="M4.2 19.8a11 11 0 0 1 0-15.6" /></svg>
}

export function CephIcon() {
  return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.959.257A11.912 11.912 0 003.503 3.76 11.92 11.92 0 000 12.217a11.934 11.934 0 001.207 5.243c.72 1.474 1.888 2.944 3.208 4.044.86-.47 1.35-.99 1.453-1.545.1-.533-.134-1.107-.737-1.805a9.031 9.031 0 01-2.219-5.937c0-4.988 4.058-9.047 9.047-9.047h.08c4.99 0 9.048 4.059 9.048 9.047a9.03 9.03 0 01-2.218 5.936c-.599.693-.84 1.292-.735 1.83.108.556.595 1.068 1.449 1.522 1.322-1.1 2.489-2.57 3.209-4.046A11.898 11.898 0 0024 12.217a11.929 11.929 0 00-3.503-8.457A11.923 11.923 0 0012.04.257h-.041zm-.005 4.837a7.072 7.072 0 00-3.76 1.075A7.202 7.202 0 006.15 8.093a7.164 7.164 0 00-1.161 2.65 7.188 7.188 0 00.04 3.125 7.14 7.14 0 001.22 2.607c.154.207.326.396.509.597l.185.202.005.006c.007.007.017.016.026.027.635.738.957 1.533.957 2.36a3.4 3.4 0 01-1.788 2.989 11.924 11.924 0 002.685 1.087c.14-.088.614-.441 1.077-1.083a4.899 4.899 0 00.94-2.99 6.595 6.595 0 00-.49-2.37 6.717 6.717 0 00-1.302-2.033l-.002-.004-.124-.142c-.21-.245-.428-.497-.602-.792a4.104 4.104 0 01-.462-1.135 4.258 4.258 0 01-.024-1.85 4.25 4.25 0 01.686-1.564 4.216 4.216 0 013.432-1.773H12.042a4.202 4.202 0 013.432 1.773c.33.466.568 1.007.686 1.565a4.27 4.27 0 01-.023 1.849c-.093.39-.249.772-.463 1.135-.173.295-.391.547-.602.792l-.123.142-.004.004a6.736 6.736 0 00-1.301 2.033 6.607 6.607 0 00-.49 2.37 4.897 4.897 0 00.94 2.99c.463.642.937.995 1.076 1.083a11.776 11.776 0 002.687-1.087 3.399 3.399 0 01-1.789-2.988c0-.817.313-1.59.956-2.359.009-.012.02-.022.027-.03l.006-.004.184-.204c.183-.2.355-.39.51-.596a7.14 7.14 0 001.22-2.608 7.21 7.21 0 00.04-3.124 7.185 7.185 0 00-1.16-2.65 7.203 7.203 0 00-2.044-1.924 7.074 7.074 0 00-3.762-1.075h-.09zM12 9.97a2.365 2.365 0 00-2.362 2.361A2.364 2.364 0 0012 14.691c1.301 0 2.36-1.059 2.36-2.36A2.364 2.364 0 0012 9.968z" /></svg>
}

export function NetFlowIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h9m11 0a2 2 0 00-2-2h-5m-9 0a2 2 0 01-2-2V7a2 2 0 012-2h11m0 0a2 2 0 002-2v-2" />
    </svg>
  )
}