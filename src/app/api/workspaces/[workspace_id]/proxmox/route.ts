// src/app/api/workspaces/[workspaceId]/proxmox/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { encrypt } from "@/src/lib/encryption";

// GET: Mengambil semua koneksi Proxmox dalam satu workspace
export async function GET(
  req: Request,
  { params }: { params: { workspace_id: string } }
) {
  try {
    const { workspace_id } = await params;
    const workspaceIdInt = parseInt(workspace_id, 10);

    console.log("Fetching Proxmox for Workspace ID:", workspaceIdInt);

    const proxmoxConnections = await prisma.proxmox.findMany({
      where: { workspace_id: workspaceIdInt },
      orderBy: { created_at: "desc" },
    });

    console.log("Proxmox Connections:", proxmoxConnections);
    return NextResponse.json(proxmoxConnections);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

// POST: Menambah koneksi Proxmox baru
export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { workspaceId } = await params;
    const workspaceIdInt = parseInt(workspaceId, 10);

    const body = await req.json();
    // const workspaceId = parseInt(params.workspaceId);

    // Enkripsi token secret sebelum masuk ke database
    const secureToken = encrypt(body.proxmox_token_secret);

    const newConn = await prisma.proxmox.create({
      data: {
        workspace_id: workspaceIdInt,
        proxmox_connection_name: body.proxmox_connection_name,
        proxmox_description: body.proxmox_description,
        proxmox_host: body.proxmox_host,
        proxmox_port: body.proxmox_port || 8006,
        proxmox_username: body.proxmox_username,
        proxmox_token_name: body.proxmox_token_name,
        proxmox_token_secret: secureToken, // Data sudah terenkripsi
        proxmox_is_active: true,
      },
    });

    // Jangan kirim balik secret yang sudah dienkripsi ke client untuk keamanan
    const { proxmox_token_secret, ...safeResponse } = newConn;
    return NextResponse.json(safeResponse, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Gagal membuat koneksi" }, { status: 500 });
  }
}