import SidebarAuth from "@/src/components/landing/SidebarProxmox";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-base-200">
      {/* Sidebar samping di desktop */}
      <SidebarAuth /> 

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
        {/* Footer landing biasanya dihapus di dashboard agar lebih profesional */}
      </div>
    </div>
  );
}