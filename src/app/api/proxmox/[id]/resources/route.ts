// src/app/api/proxmox/[id]/resources/route.ts

import { withProxmoxClient } from '@/src/lib/proxmox/helper';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProxmoxClient(id, async (client) => {
    const response = await client.get('/cluster/resources');
    // console.log("Data resources dari Proxmox API:", response.data); // Logging untuk debugging
    return response.data;
  });
}