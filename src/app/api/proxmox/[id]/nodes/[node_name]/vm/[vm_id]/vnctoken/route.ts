// api/proxmox/[id]/nodes/[node_name]/vm/[vm_id]/vnctoken/route.ts
// Endpoint untuk mendapatkan VNC ticket dari Proxmox API

import { withProxmoxClient } from '@/src/lib/proxmox/helper';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{
    id: string;
    node_name: string;
    vm_id: string;
  }>;
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id, node_name, vm_id } = await params;

    if (!id || !node_name || !vm_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    return await withProxmoxClient(id, async (client) => {
      // Panggil vncproxy endpoint Proxmox untuk mendapatkan ticket + port
      const response = await client.post(`/nodes/${node_name}/qemu/${vm_id}/vncproxy`, {
        websocket: 1,
        'generate-password': 0,
      });

      const { ticket, port } = response.data.data;

      return { ticket, port, proxmox_id: id, node: node_name, vmid: vm_id };
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to get VNC token' },
      { status: 500 }
    );
  }
}
