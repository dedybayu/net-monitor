// src/app/api/workspaces/[workspaceId]/proxmox/[proxmoxId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma/client";
import { encrypt } from "@/src/lib/security/encryption";

// Definisikan tipe params sesuai dengan folder dynamic route kamu
type RouteParams = {
  params: Promise<{ workspace_id: string; proxmox_id: string }>;
};

// GET: Detail satu koneksi Proxmox
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // 1. Await params
    const { proxmox_id } = await params;
    const id = parseInt(proxmox_id);

    const connection = await prisma.proxmox.findUnique({
      where: { proxmox_id: id },
    });

    if (!connection) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

    return NextResponse.json(connection);
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil detail" }, { status: 500 });
  }
}

// PATCH: Update data koneksi (Partial Update)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    // 1. Await params
    const { proxmox_id } = await params;
    const id = parseInt(proxmox_id);
    
    const body = await req.json();

    // Jika user mengupdate password/token, enkripsi ulang
    if (body.proxmox_token_secret) {
      body.proxmox_token_secret = encrypt(body.proxmox_token_secret);
    }

    const updated = await prisma.proxmox.update({
      where: { proxmox_id: id },
      data: body,
    });

    const { proxmox_token_secret, ...safeResponse } = updated;
    return NextResponse.json(safeResponse);
  } catch (error) {
    return NextResponse.json({ error: "Gagal update" }, { status: 500 });
  }
}

// DELETE: Menghapus koneksi Proxmox
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    // 1. Await params
    const { proxmox_id } = await params;
    const id = parseInt(proxmox_id);

    await prisma.proxmox.delete({
      where: { proxmox_id: id },
    });

    return NextResponse.json({ message: "Koneksi berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}