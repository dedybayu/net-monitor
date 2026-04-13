import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route"; // Sesuaikan path authOptions Anda

interface RouteParams {
  params: Promise<{ workspace_id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // 1. Ambil Session dari NextAuth
    const session = await getServerSession(authOptions);

    // debug login
    // console.log("Session Data:", session);
    // Jika tidak ada session, user belum login
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, message: "Silahkan login terlebih dahulu" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id, 10);
    const { workspace_id } = await params;
    const workspaceIdInt = parseInt(workspace_id, 10);

    if (isNaN(workspaceIdInt)) {
      return NextResponse.json(
        { success: false, message: "ID Workspace tidak valid" },
        { status: 400 }
      );
    }

    // 2. Query ke tabel pivot UserWorkspace untuk cek akses
    const userAccess = await prisma.userWorkspace.findFirst({
      where: {
        workspace_id: workspaceIdInt,
        user_id: userId,
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: { nodes: true }
            }
          }
        }
      }
    });

    // 3. Validasi Hak Akses
    if (!userAccess) {
      // Cek apakah workspacenya memang tidak ada atau hanya tidak punya akses
      const workspaceExists = await prisma.workspace.findUnique({
        where: { workspace_id: workspaceIdInt }
      });

      if (!workspaceExists) {
        return NextResponse.json(
          { success: false, message: "Workspace tidak ditemukan" },
          { status: 404 }
        );
      }

      // Workspace ada, tapi user ini tidak terdaftar di dalamnya
      return NextResponse.json(
        { success: false, message: "Anda tidak memiliki akses ke workspace ini" },
        { status: 403 }
      );
    }

    // 4. Berhasil: Return data workspace dan role user di dalamnya
    return NextResponse.json({
      success: true,
      data: userAccess.workspace,
      user_permission: userAccess.permision // Mengambil string 'permission' dari pivot table
    });

  } catch (error) {
    console.error("Workspace API Error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}