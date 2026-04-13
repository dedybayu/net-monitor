// src/app/api/workspaces/[workspace_id]/proxmox/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma/client";
import { encrypt } from "@/src/lib/security/encryption";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspace_id: string }> } // Definisikan sebagai Promise untuk Next.js 15
) {
  try {
    // 1. Await params terlebih dahulu
    const resolvedParams = await params;
    const workspaceIdStr = resolvedParams.workspace_id;

    // 2. Logging untuk debugging (Cek di terminal console)
    console.log("Raw workspace_id dari params:", workspaceIdStr);

    const workspaceIdInt = parseInt(workspaceIdStr, 10);

    // 3. Validasi apakah hasil parse adalah angka
    if (isNaN(workspaceIdInt)) {
      console.error("Gagal parse workspaceId. Value:", workspaceIdStr);
      return NextResponse.json(
        { error: `Workspace ID tidak valid. Diterima: ${workspaceIdStr}` },
        { status: 400 }
      );
    }

    const body = await req.json();

    // 4. Enkripsi
    const secureToken = encrypt(body.proxmox_token_secret);

    // 5. Simpan ke Database
    const newConn = await prisma.proxmox.create({
      data: {
        workspace_id: workspaceIdInt,
        proxmox_connection_name: body.proxmox_connection_name,
        proxmox_description: body.proxmox_description,
        proxmox_host: body.proxmox_host,
        proxmox_port: body.proxmox_port || 8006,
        proxmox_username: body.proxmox_username,
        proxmox_token_name: body.proxmox_token_name,
        proxmox_token_secret: secureToken,
        proxmox_is_active: true,
      },
    });

    const { proxmox_token_secret, ...safeResponse } = newConn;
    return NextResponse.json(safeResponse, { status: 201 });

  } catch {
    console.error("Error creating Proxmox connection:");
    return NextResponse.json(
      { error: "Gagal membuat koneksi" },
      { status: 500 }
    );
  }
}

// Lakukan hal yang sama untuk fungsi GET
export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspace_id: string }> }
) {
  try {
    const resolvedParams = await params;
    const workspaceIdInt = parseInt(resolvedParams.workspace_id, 10);

    if (isNaN(workspaceIdInt)) {
      return NextResponse.json({ error: "Workspace ID tidak valid" }, { status: 400 });
    }

    const proxmoxConnections = await prisma.proxmox.findMany({
      where: { workspace_id: workspaceIdInt },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(proxmoxConnections);
  } catch  {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}