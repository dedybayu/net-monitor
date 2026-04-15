import { withProxmoxClient } from '@/src/lib/proxmox/helper';

/**
 * @swagger
 * /api/proxmox/{id}/cluster-status:
 *   get:
 *     tags: [Proxmox]
 *     summary: Mendapatkan status cluster Proxmox berdasarkan ID
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
    const response = await client.get('/cluster/status');
    return response.data;
  });
}