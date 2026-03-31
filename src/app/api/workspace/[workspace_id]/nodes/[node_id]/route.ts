import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma'; 
interface RouteParams {
  params: Promise<{
    workspace_id: string;
    node_id: string;
  }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { workspace_id, node_id } = await params;

    const workspaceIdInt = parseInt(workspace_id, 10);
    const nodeIdInt = parseInt(node_id, 10);

    // 1. Ambil data Node beserta relasi services-nya
    const node = await prisma.node.findFirst({
      where: {
        node_id: nodeIdInt,
        workspace_id: workspaceIdInt,
      },
      include: {
        services: true, // Join ke tabel node_services
      },
    });

    // 2. Jika node tidak ditemukan
    if (!node) {
      return NextResponse.json(
        { error: 'Node tidak ditemukan di workspace ini' },
        { status: 404 }
      );
    }

    // 3. Mapping data ke format JSON yang diinginkan
    const response = {
      node_id: node.node_id,
      node_label: node.node_label,
      node_description: node.node_description,
      node_ip_address: node.node_ip_address,
      node_method: node.node_method,
      node_port: node.node_port,
      // Mapping array services
      services: node.services.map((svc) => ({
        node_service_id: svc.node_service_id,
        node_service_name: svc.node_service_name,
        node_service_description: svc.node_service_description,
        node_service_ip_address: svc.node_service_ip_address, // Diambil dari model node induk
        node_service_method: svc.node_service_method,
        node_service_port: svc.node_service_port,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('FETCH NODE SERVICE ERROR:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}