import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma'; // Sesuaikan path dengan lokasi lib/prisma.ts

interface RouteParams {
    params: Promise<{
        workspace_id: string; // Harus ada karena ada di folder [workspace_id]
        node_id: string;
    }>;
}

export async function POST(req: Request, { params }: RouteParams) {
    try {
        const { node_id } = await params;
        const nodeIdInt = parseInt(node_id, 10);

        if (isNaN(nodeIdInt)) {
            return NextResponse.json({ error: "Invalid Node ID" }, { status: 400 });
        }

        const body = await req.json();
        const { name, description, ip, method, port } = body;

        // Validasi input minimal
        if (!name || !ip) {
            return NextResponse.json({ error: "Name and IP are required" }, { status: 400 });
        }

        const newService = await prisma.nodeService.create({
            data: {
                node_id: nodeIdInt,
                node_service_name: name,
                node_service_description: description || "",
                node_service_ip_address: ip,
                node_service_method: method || "TCP",
                node_service_port: port ? parseInt(port.toString(), 10) : 0,
            },
        });

        return NextResponse.json(newService, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Gagal membuat service" }, { status: 500 });
    }
}