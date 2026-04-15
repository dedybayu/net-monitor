// src/app/api/proxmox/[id]/nodes/[node_name]/vm/route.ts
import { withProxmoxClient } from '@/src/lib/proxmox/helper';
import { NextResponse } from 'next/server';

// Definisikan interface sesuai struktur folder [id]/[node_name]
interface RouteContext {
  params: Promise<{
    id: string;
    node_name: string;
  }>;
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    // Cukup satu kali await untuk mengambil semua parameter
    const { id, node_name } = await params;

    if (!id || !node_name) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    return await withProxmoxClient(id, async (client) => {
      const response = await client.get(`/nodes/${node_name}/qemu`);
      
      // Pastikan mengembalikan Response object atau data yang sesuai
      return response.data;
    });
  } catch {
    // console.error('Proxmox API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}