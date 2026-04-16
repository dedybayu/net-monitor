"use client"

import SidebarComponent, { WorkspaceIcon, InfoIcon } from "./SidebarComponent"

export default function NavbarAuth() {
  return (
    <SidebarComponent
      menuItems={[
        { href: "/workspaces", label: "Workspace", icon: <WorkspaceIcon /> },
        { href: "/about", label: "Tentang Kami", icon: <InfoIcon /> },
      ]}
    />
  )
}