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
    const [clusterResponse, nodesResponse, resourcesResponse] = await Promise.all([
      client.get('/cluster/status'),
      client.get('/nodes'),
      client.get('/cluster/resources')
    ]);

    const clusterData = clusterResponse.data?.data || [];
    const nodesData = nodesResponse.data?.data || [];
    const resourcesData = resourcesResponse.data?.data || [];

    // Hitung storage dari resources (karena Proxmox Web UI menggunakan ini)
    const storages = resourcesData.filter((r: any) => r.type === 'storage');
    const uniqueStorages = new Map();
    // Gunakan storage ID sebagai key agar shared storage tidak dihitung double
    // Untuk storage lokal (tidak shared), gunakan kombinasi node dan storage ID
    storages.forEach((s: any) => {
      const isShared = s.shared === 1;
      const key = isShared ? s.storage : `${s.node}-${s.storage}`;
      uniqueStorages.set(key, s);
    });

    let totalStorageMax = 0;
    let totalStorageUsed = 0;
    uniqueStorages.forEach((s: any) => {
      totalStorageMax += s.maxdisk || 0;
      totalStorageUsed += s.disk || 0;
    });

    const nodesMap = new Map();
    if (Array.isArray(nodesData)) {
      nodesData.forEach((node: any) => {
        nodesMap.set(node.node, node);
      });
    }

    const mergedData = Array.isArray(clusterData) ? clusterData.map((item: any) => {
      if (item.type === 'node') {
        const nodeDetail = nodesMap.get(item.name);
        if (nodeDetail) {
          return { ...item, ...nodeDetail };
        }
      }
      return item;
    }) : clusterData;

    return { 
      ...clusterResponse.data, 
      data: mergedData,
      clusterStorage: {
        maxdisk: totalStorageMax,
        disk: totalStorageUsed
      }
    };
  });
}