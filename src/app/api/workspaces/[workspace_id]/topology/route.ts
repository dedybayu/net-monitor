import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/client'; // Sesuaikan path prisma client Anda

// Definisi interface untuk kejelasan tipe data
interface RouteParams {
  params: Promise<{ workspace_id: string }>;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: {
    stroke?: string;
  };
  // Tambahkan property lain jika kamu mengirimkan data tambahan dari frontend
}

interface ReactFlowNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    target: string;
    method: 'ICMP' | 'TCP';
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  // 1. Ambil workspace_id dari parameter URL
  const { workspace_id } = await params;
  const workspaceIdInt = parseInt(workspace_id, 10);

  const nodes = await prisma.node.findMany({
    where: { workspace_id: workspaceIdInt },
  });

  const edges = await prisma.edge.findMany({
    where: { workspace_id: workspaceIdInt },
  });

  // Map data DB kembali ke format React Flow
  const rfNodes = nodes.map((n) => ({
    id: n.node_react_id,
    node_id: n.node_id,
    type: n.node_type,
    position: { x: n.node_posX, y: n.node_posY },
    data: {
      label: n.node_label,
      target: n.node_ip_address + (n.node_port ? `:${n.node_port}` : ''),
      method: n.node_method,
      status: 'offline', // Default, nanti diupdate SWR
      latency: '...'
    },
  }));

  const rfEdges = edges.map((e) => ({
    id: `e${e.edge_id}`,
    source: e.source_react_id,
    target: e.target_react_id,
    animated: true,
    style: { stroke: '#3b82f6' },
  }));

  return NextResponse.json({ nodes: rfNodes, edges: rfEdges });
}

export async function POST(req: Request, { params }: RouteParams) {
  const { workspace_id } = await params;
  const workspaceIdInt = parseInt(workspace_id, 10);

  try {
    const { nodes, edges } = await req.json();

    await prisma.$transaction(async (tx) => {
      // --- 1. SINKRONISASI NODES ---
      const currentReactNodeIds = nodes.map((n: ReactFlowNode) => n.id);

      // Hapus node yang sudah tidak ada di kanvas
      await tx.node.deleteMany({
        where: {
          workspace_id: workspaceIdInt,
          node_react_id: { notIn: currentReactNodeIds }
        }
      });

      // Update atau Create Nodes
      for (const node of nodes) {
        const [ip, port] = node.data.target.split(':');

        // 1. Cari dulu apakah node ini sudah ada di workspace ini
        const existingNode = await tx.node.findFirst({
          where: {
            workspace_id: workspaceIdInt,
            node_react_id: node.id
          }
        });

        if (existingNode) {
          // 2. Jika ada, UPDATE
          await tx.node.update({
            where: { node_id: existingNode.node_id },
            data: {
              node_posX: node.position.x,
              node_posY: node.position.y,
              node_label: node.data.label,
              node_ip_address: ip,
              node_port: port ? parseInt(port, 10) : 0,
              node_method: node.data.method,
            }
          });
        } else {
          // 3. Jika tidak ada, CREATE
          await tx.node.create({
            data: {
              workspace_id: workspaceIdInt,
              node_react_id: node.id,
              node_label: node.data.label,
              node_ip_address: ip,
              node_port: port ? parseInt(port, 10) : 0,
              node_method: node.data.method,
              node_posX: node.position.x,
              node_posY: node.position.y,
            }
          });
        }
      }

      // --- 2. SINKRONISASI EDGES (LOGIKA REKONSILIASI) ---

      // Ambil semua edge yang ada di database saat ini
      const existingEdges = await tx.edge.findMany({
        where: { workspace_id: workspaceIdInt }
      });

      // Helper untuk membandingkan edge berdasarkan source & target
      const getEdgeKey = (s: string, t: string) => `${s}->${t}`;

      const incomingEdgeKeys = edges.map((e: ReactFlowEdge) => getEdgeKey(e.source, e.target));
      const existingEdgeKeys = existingEdges.map((e) => getEdgeKey(e.source_react_id, e.target_react_id));

      // A. Hapus edge yang ada di DB tapi tidak ada di Request (User hapus garis)
      const edgesToDelete = existingEdges.filter(
        (ex) => !incomingEdgeKeys.includes(getEdgeKey(ex.source_react_id, ex.target_react_id))
      );

      if (edgesToDelete.length > 0) {
        await tx.edge.deleteMany({
          where: {
            edge_id: { in: edgesToDelete.map(e => e.edge_id) }
          }
        });
      }

      // B. Buat edge baru yang ada di Request tapi belum ada di DB (User tambah garis)
      const edgesToCreate = edges.filter(
        (incoming: ReactFlowEdge) => !existingEdgeKeys.includes(getEdgeKey(incoming.source, incoming.target))
      );

      if (edgesToCreate.length > 0) {
        await tx.edge.createMany({
          data: edgesToCreate.map((e: ReactFlowEdge) => ({
            workspace_id: workspaceIdInt,
            source_react_id: e.source,
            target_react_id: e.target,
          }))
        });
      }
    });

    return NextResponse.json({ message: 'Topologi berhasil diperbarui secara efisien' });
  } catch (error) {
    console.error("SAVE ERROR:", error);
    return NextResponse.json(
      { error: 'Gagal menyimpan perubahan topologi' },
      { status: 500 }
    );
  }
}