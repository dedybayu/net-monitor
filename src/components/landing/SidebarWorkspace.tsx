"use client"

import { useParams } from "next/navigation"
import SidebarComponent, { DashboardIcon, TopologyIcon, ProxmoxIcon } from "./SidebarComponent"

export default function NavbarWorkspace() {
  const params = useParams()
  const workspaceId = params.workspace_id as string

  return (
    <SidebarComponent
      menuItems={[
        { href: `/workspaces/${workspaceId}/dashboard`, label: "Dasboard", icon: <DashboardIcon /> },
        { href: `/workspaces/${workspaceId}/topology`, label: "Topology", icon: <TopologyIcon /> },
        { href: `/workspaces/${workspaceId}/proxmox`, label: "Proxmox", icon: <ProxmoxIcon /> },
      ]}
    />
  )
}