"use client";

import { usePathname } from "next/navigation";
import SidebarWorkspace from "@/src/components/landing/SidebarWorkspace";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 1. Bersihkan path dari string kosong
  const pathParts = pathname.split("/").filter(Boolean);
  const proxmoxIndex = pathParts.indexOf("proxmox");

  /**
   * Logika Deteksi Detail yang Lebih Pintar:
   * Is detail jika:
   * - Ada part setelah "proxmox"
   * - DAN part setelahnya BUKAN kata "new"
   */
  const nextPart = pathParts[proxmoxIndex + 1];
  const isProxmoxDetail = 
    proxmoxIndex !== -1 && 
    nextPart && 
    nextPart !== "new"; 

  // JIKA DETAIL (dan bukan 'new'): Lepas Sidebar Workspace
  if (isProxmoxDetail) {
    return <>{children}</>; 
  }

  // JIKA DAFTAR atau HALAMAN NEW: Tampilkan Sidebar Workspace
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-base-200">
      <SidebarWorkspace /> 
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}