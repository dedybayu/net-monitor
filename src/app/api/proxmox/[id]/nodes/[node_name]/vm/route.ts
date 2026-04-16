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

/**
 * @swagger
 * /api/proxmox/{id}/nodes/{node_name}/vm:
 *   get:
 *     tags: [Proxmox]
 *     summary: Mendapatkan daftar Virtual Machine (VM) pada node tertentu
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dari instance Proxmox
 *       - in: path
 *         name: node_name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nama node Proxmox
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan daftar VM
 *       400:
 *         description: Parameter tidak lengkap
 *       500:
 *         description: Internal Server Error
 */
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