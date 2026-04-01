// File path: app/api/workspace/[workspace_id]/nodes/[node_id]/services/[service_id]/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

interface RouteParams {
  params: Promise<{
    workspace_id: string;
    node_id: string;
    service_id: string;
  }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { node_id, service_id } = await params;
    const nodeIdInt    = parseInt(node_id,    10);
    const serviceIdInt = parseInt(service_id, 10);

    if (isNaN(nodeIdInt) || isNaN(serviceIdInt)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, ip, method, port } = body;

    if (!name || !ip) {
      return NextResponse.json({ error: 'Name and IP are required' }, { status: 400 });
    }

    const updated = await prisma.nodeService.update({
      where: {
        node_service_id: serviceIdInt,
        node_id: nodeIdInt,        // pastikan service milik node yang benar
      },
      data: {
        node_service_name:        name,
        node_service_description: description || '',
        node_service_ip_address:  ip,
        node_service_method:      method || 'TCP',
        node_service_port:        port ? parseInt(port.toString(), 10) : 0,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Gagal mengupdate service' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { node_id, service_id } = await params;
    const nodeIdInt    = parseInt(node_id,    10);
    const serviceIdInt = parseInt(service_id, 10);

    if (isNaN(nodeIdInt) || isNaN(serviceIdInt)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.nodeService.delete({
      where: {
        node_service_id: serviceIdInt,
        node_id: nodeIdInt,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus service' }, { status: 500 });
  }
}