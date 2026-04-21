import { withProxmoxClient } from '@/src/lib/proxmox/helper';

/**
 * @swagger
 * /api/proxmox/{id}/ceph:
 *   get:
 *     tags: [Proxmox]
 *     summary: Mendapatkan status ceph Proxmox berdasarkan ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dari instance Proxmox
 *     responses:
 *       200:
 *         description: OK
 */

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProxmoxClient(id, async (client) => {
    const response = await client.get('/cluster/ceph/status');
    return response.data;
  });
}