"use client"

import { useParams } from "next/navigation"
import SidebarComponent, { DashboardIcon, NodeIcon, ResourcesIcon, TaskIcon, VMIcon, CTIcon } from "./SidebarComponent"

export default function NavbarProxmox() {
  const params = useParams()
  const workspaceId = params.workspace_id as string
  const proxmoxId = params.proxmox_id as string

  return (
    <SidebarComponent
      menuItems={[
        { href: `/workspaces/${workspaceId}/proxmox/${proxmoxId}`, label: "Dasboard", icon: <DashboardIcon /> },
        { href: `/workspaces/${workspaceId}/proxmox/${proxmoxId}/nodes`, label: "Node List", icon: <NodeIcon /> },
        { href: `/workspaces/${workspaceId}/proxmox/${proxmoxId}/resources`, label: "Resources", icon: <ResourcesIcon /> },
        { href: `/workspaces/${workspaceId}/proxmox/${proxmoxId}/recent-tasks`, label: "Recent Tasks", icon: <TaskIcon /> },
        { href: `/workspaces/${workspaceId}/proxmox/${proxmoxId}/vms`, label: "VM List", icon: <VMIcon /> },
        { href: `/workspaces/${workspaceId}/proxmox/${proxmoxId}/cts`, label: "CT List", icon: <CTIcon /> },
      ]}
    />
  )
}