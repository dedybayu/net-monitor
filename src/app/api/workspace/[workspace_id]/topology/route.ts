import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma'; // Sesuaikan path prisma client Anda

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

// app/api/workspace/[workspace_id]/topology/route.ts

export async function POST(req: Request, { params }: RouteParams) {
  const { workspace_id } = await params;
  const workspaceIdInt = parseInt(workspace_id, 10);
  const { nodes, edges } = await req.json();

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Hapus Edges lama
      await tx.edge.deleteMany({ where: { workspace_id: workspaceIdInt } });

      // 2. Simpan/Update Nodes
      for (const node of nodes) {
        const [ip, port] = node.data.target.split(':');
        
        // Kita gunakan findFirst + conditional update/create 
        // karena node_id di DB adalah Integer Autoincrement
        const existingNode = await tx.node.findFirst({
          where: {
            workspace_id: workspaceIdInt,
            node_react_id: node.id // ID unik dari React Flow (e.g. '1' atau 'node_xxx')
          }
        });

        if (existingNode) {
          await tx.node.update({
            where: { node_id: existingNode.node_id },
            data: {
              node_posX: node.position.x,
              node_posY: node.position.y,
              node_label: node.data.label,
              node_ip_address: ip,
              node_port: port ? parseInt(port) : 0,
              node_method: node.data.method,
            }
          });
        } else {
          await tx.node.create({
            data: {
              workspace_id: workspaceIdInt,
              node_react_id: node.id,
              node_label: node.data.label,
              node_ip_address: ip,
              node_port: port ? parseInt(port) : 0,
              node_method: node.data.method,
              node_posX: node.position.x,
              node_posY: node.position.y,
            }
          });
        }
      }

      // 3. Simpan Edges baru
      if (edges.length > 0) {
        await tx.edge.createMany({
          data: edges.map((edge: ReactFlowEdge) => ({
            workspace_id: workspaceIdInt,
            source_react_id: edge.source,
            target_react_id: edge.target,
          })),
        });
      }
    });

    return NextResponse.json({ message: 'Saved successfully' });
  } catch (error) {
    console.error("SAVE ERROR:", error); // Muncul di terminal VS Code
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}