import { withProxmoxClient } from '@/src/lib/proxmox/helper';


/**
 * @swagger
 * /api/proxmox/{id}/nodes:
 *   get:
 *     tags: [Proxmox]
 *     summary: Mendapatkan data nodes berdasarkan ID Proxmox
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dari instance Proxmox
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan data nodes
 */

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withProxmoxClient(id, async (client) => {
    const response = await client.get('/nodes');
    return response.data;
  });
}