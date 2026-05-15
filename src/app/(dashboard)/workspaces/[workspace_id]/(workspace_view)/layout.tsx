"use client";


import SidebarWorkspace from "@/src/components/landing/SidebarWorkspace";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-base-200">
      <SidebarWorkspace /> 
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}