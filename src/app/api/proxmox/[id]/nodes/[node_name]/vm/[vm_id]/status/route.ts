// api/proxmox/[id]/nodes/[node_name]/vm/[vm_id]/status/route.ts

import { withProxmoxClient } from '@/src/lib/proxmox/helper';
import { NextResponse } from 'next/server';

// Definisikan interface sesuai struktur folder [id]/[node_name]
interface RouteContext {
  params: Promise<{
    id: string;
    node_name: string;
    vm_id: string;
  }>;
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    // Cukup satu kali await untuk mengambil semua parameter
    const { id, node_name, vm_id } = await params;

    if (!id || !node_name) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    return await withProxmoxClient(id, async (client) => {
      const response = await client.get(`/nodes/${node_name}/qemu/${vm_id}/status/current`);
      
      return response.data;
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}