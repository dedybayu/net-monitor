import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma"; // Sesuaikan dengan lokasi prisma client Anda
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route"; // Sesuaikan path authOptions Anda
import { getServerSession } from "next-auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // session.user.id di NextAuth biasanya string
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // --- PERBAIKAN DI SINI ---
    // Ubah string ID dari session menjadi Integer agar cocok dengan Database (Prisma)
    const userIdInt = parseInt(userId, 10);

    if (isNaN(userIdInt)) {
      return NextResponse.json({ message: "Invalid User ID" }, { status: 400 });
    }

    const userWorkspaces = await prisma.userWorkspace.findMany({
      where: {
        user_id: userIdInt, // Gunakan hasil parseInt
      },
      include: {
        workspace: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const workspaces = userWorkspaces.map((uw) => ({
      ...uw.workspace,
      permission: uw.permision,
    }));

    return NextResponse.json(workspaces);
  } catch (error) {
    // Tambahkan log untuk debug di terminal
    console.error("Workspace Fetch Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}