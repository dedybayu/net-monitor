// File path: app/api/workspace/[workspace_id]/nodes/[node_id]/route.ts

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
    const nodeIdInt      = parseInt(node_id,      10);

    if (isNaN(workspaceIdInt) || isNaN(nodeIdInt)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const node = await prisma.node.findFirst({
      where: { node_id: nodeIdInt, workspace_id: workspaceIdInt },
      include: { services: true },
    });

    if (!node) {
      return NextResponse.json(
        { error: 'Node tidak ditemukan di workspace ini' },
        { status: 404 }
      );
    }

    const response = {
      node_id:          node.node_id,
      node_label:       node.node_label,
      node_description: node.node_description,
      node_ip_address:  node.node_ip_address,
      node_method:      node.node_method,
      node_port:        node.node_port,
      services: node.services.map((svc) => ({
        node_service_id:          svc.node_service_id,
        node_service_name:        svc.node_service_name,
        node_service_description: svc.node_service_description,
        node_service_ip_address:  svc.node_service_ip_address,
        node_service_method:      svc.node_service_method,
        node_service_port:        svc.node_service_port,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('FETCH NODE ERROR:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ── PATCH /api/workspace/[workspace_id]/nodes/[node_id] ───────────────────
// Body: { label?, description?, ip?, method?, port? }
// Hanya field yang dikirim yang akan diupdate (partial update).

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { workspace_id, node_id } = await params;

    const workspaceIdInt = parseInt(workspace_id, 10);
    const nodeIdInt      = parseInt(node_id,      10);

    if (isNaN(workspaceIdInt) || isNaN(nodeIdInt)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Pastikan node milik workspace yang benar sebelum update
    const existing = await prisma.node.findFirst({
      where: { node_id: nodeIdInt, workspace_id: workspaceIdInt },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Node tidak ditemukan di workspace ini' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { label, description, ip, method, port } = body;

    // Validasi minimal: label dan ip tidak boleh kosong jika disertakan
    if (label !== undefined && !label.trim()) {
      return NextResponse.json({ error: 'Label tidak boleh kosong' }, { status: 400 });
    }
    if (ip !== undefined && !ip.trim()) {
      return NextResponse.json({ error: 'IP tidak boleh kosong' }, { status: 400 });
    }

    const updated = await prisma.node.update({
      where: { node_id: nodeIdInt },
      data: {
        ...(label       !== undefined && { node_label:       label.trim() }),
        ...(description !== undefined && { node_description: description }),
        ...(ip          !== undefined && { node_ip_address:  ip.trim() }),
        ...(method      !== undefined && { node_method:      method }),
        ...(port        !== undefined && { node_port:        parseInt(port.toString(), 10) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH NODE ERROR:', error);
    return NextResponse.json({ error: 'Gagal mengupdate node' }, { status: 500 });
  }
}

// ── DELETE /api/workspace/[workspace_id]/nodes/[node_id] ──────────────────
// Menghapus node beserta semua service-nya (cascade via Prisma relation).

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { workspace_id, node_id } = await params;

    const workspaceIdInt = parseInt(workspace_id, 10);
    const nodeIdInt      = parseInt(node_id,      10);

    if (isNaN(workspaceIdInt) || isNaN(nodeIdInt)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Pastikan node milik workspace yang benar sebelum hapus
    const existing = await prisma.node.findFirst({
      where: { node_id: nodeIdInt, workspace_id: workspaceIdInt },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Node tidak ditemukan di workspace ini' },
        { status: 404 }
      );
    }

    // Hapus services terlebih dahulu jika schema tidak pakai onDelete: Cascade
    await prisma.nodeService.deleteMany({ where: { node_id: nodeIdInt } });

    await prisma.node.delete({ where: { node_id: nodeIdInt } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE NODE ERROR:', error);
    return NextResponse.json({ error: 'Gagal menghapus node' }, { status: 500 });
  }
}