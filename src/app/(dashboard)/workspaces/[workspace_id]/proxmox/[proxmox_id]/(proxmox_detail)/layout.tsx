import NavbarProxmox from "@/src/components/landing/SidebarProxmox";

export default function ProxmoxDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-base-200">
      {/* Sidebar samping di desktop */}
      <NavbarProxmox /> 

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
        {/* Footer landing biasanya dihapus di dashboard agar lebih profesional */}
      </div>
    </div>
  );
}