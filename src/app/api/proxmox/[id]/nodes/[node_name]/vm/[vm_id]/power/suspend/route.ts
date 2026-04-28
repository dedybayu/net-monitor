// api/proxmox/[id]/nodes/[node_name]/vm/[vm_id]/power/shutdown/route.ts

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
      const response = await client.post(`/nodes/${node_name}/qemu/${vm_id}/status/suspend`);
      
      return response.data;
    });
  } catch (error: any) {
    console.error("Failed to suspend VM:", error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}