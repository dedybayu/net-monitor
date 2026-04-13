import { withProxmoxClient } from '@/src/lib/proxmox/helper';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProxmoxClient(id, async (client) => {
    const response = await client.get('/cluster/status');
    return response.data;
  });
}