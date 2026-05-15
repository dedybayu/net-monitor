"use client"

import SidebarComponent, { WorkspaceIcon, InfoIcon, DashboardIcon, UsersIcon } from "./SidebarComponent"

export default function NavbarAuth() {
  return (
    <SidebarComponent
      menuItems={[
        { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
        { href: "/workspaces", label: "Workspace", icon: <WorkspaceIcon /> },
        { href: "/users", label: "Users", icon: <UsersIcon /> },
        { href: "/about", label: "Tentang Kami", icon: <InfoIcon /> },
      ]}
    />
  )
}