"use client";


import Sidebar from "@/src/components/landing/SidebarAuth";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-base-200">
      <Sidebar /> 
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}