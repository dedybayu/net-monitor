import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

// Definisi interface untuk kejelasan tipe data
interface RouteParams {
  params: Promise<{ workspace_id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // 1. Ambil workspace_id dari parameter URL
    const { workspace_id } = await params;
    const workspaceIdInt = parseInt(workspace_id, 10);

    // Validasi jika workspace_id bukan angka
    if (isNaN(workspaceIdInt)) {
      return NextResponse.json(
        { success: false, message: "ID Workspace tidak valid" },
        { status: 400 }
      );
    }

    // 2. Ambil data nodes dari database berdasarkan workspace_id
    const nodes = await prisma.node.findMany({
      where: {
        workspace_id: workspaceIdInt,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    // 3. Transformasi data agar sesuai dengan kebutuhan Frontend
    const formattedDevices = nodes.map((node) => {
      // Logika penggabungan IP dan Port
      const hasPort = node.node_port && node.node_port > 0;
      const target = hasPort 
        ? `${node.node_ip_address}:${node.node_port}` 
        : node.node_ip_address;

      return {
        id: node.node_id.toString(),
        node_react_id: node.node_react_id, // Penting untuk React Flow
        name: node.node_label,
        target: target,
        method: node.node_method, // ICMP atau TCP
        description: node.node_description
      };
    });

    // 4. Return data dalam format JSON
    return NextResponse.json(formattedDevices);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan sistem";
    console.error("Error fetching nodes:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Gagal mengambil data perangkat dari database",
        error: errorMessage 
      }, 
      { status: 500 }
    );
  }
}