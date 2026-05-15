import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma/client";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

async function getUserId() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;
  const userIdInt = parseInt(userId, 10);
  return isNaN(userIdInt) ? null : userIdInt;
}

/**
 * GET: Mengambil workspace milik sendiri (Owner) DAN yang dibagikan ke saya
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const [ownedWorkspaces, sharedWorkspaces] = await Promise.all([
      // Workspace milik sendiri
      prisma.workspace.findMany({
        where: { owner_id: userId },
        orderBy: { created_at: 'desc' }
      }),
      // Workspace yang dibagikan (bukan milik sendiri)
      prisma.workspace.findMany({
        where: {
          users: { some: { user_id: userId } },
          NOT: { owner_id: userId } // exclude milik sendiri
        },
        include: {
          // Sertakan info owner jika ingin tampilkan "Shared by X"
          owner: { select: { name: true, email: true } },
          users: {
            where: { user_id: userId },
            select: { permision: true }
          }
        },
        orderBy: { created_at: 'desc' }
      }),
    ]);

    const ownedWithPermission = ownedWorkspaces.map(ws => ({
      ...ws,
      permission: "owner"
    }));

    const sharedWithPermission = sharedWorkspaces.map(ws => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { users, ...rest } = ws;
      return {
        ...rest,
        permission: users?.[0]?.permision || "viewer"
      };
    });

    return NextResponse.json({ owned: ownedWithPermission, shared: sharedWithPermission });
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Membuat Workspace baru (User otomatis jadi owner_id)
 */
export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { workspace_name, workspace_description } = await req.json();

    const newWorkspace = await prisma.workspace.create({
      data: {
        workspace_name,
        workspace_description,
        owner_id: userId, // Set owner secara eksplisit
      },
    });

    const newUserWorkspace = await prisma.userWorkspace.create({
      data: {
        workspace_id: newWorkspace.workspace_id,
        user_id: userId,
        permision: "write",
      },
    });

    return NextResponse.json({ newWorkspace, newUserWorkspace }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error creating workspace" }, { status: 500 });
  }
}

/**
 * PATCH: Update Workspace (Hanya bisa oleh Owner)
 */
export async function PATCH(req: Request) {
  try {
    const userId = await getUserId();
    const { workspace_id, workspace_name, workspace_description } = await req.json();

    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Cek apakah user adalah OWNER
    const workspace = await prisma.workspace.findUnique({
      where: { workspace_id: parseInt(workspace_id) }
    });

    if (!workspace || workspace.owner_id !== userId) {
      return NextResponse.json({ message: "Forbidden: Not the owner" }, { status: 403 });
    }

    const updated = await prisma.workspace.update({
      where: { workspace_id: parseInt(workspace_id) },
      data: { workspace_name, workspace_description },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}

/**
 * DELETE: Menghapus Workspace (Hanya bisa oleh Owner)
 */
export async function DELETE(req: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("id");

    if (!userId || !workspaceId) {
      return NextResponse.json({ message: "Invalid Request" }, { status: 400 });
    }

    const wsIdInt = parseInt(workspaceId);

    // Pastikan yang menghapus adalah OWNER
    const workspace = await prisma.workspace.findUnique({
      where: { workspace_id: wsIdInt }
    });

    if (!workspace || workspace.owner_id !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Hapus workspace (Jika di DB diset Cascade, UserWorkspace akan ikut terhapus)
    await prisma.workspace.delete({
      where: { workspace_id: wsIdInt }
    });

    return NextResponse.json({ message: "Workspace deleted" });
  } catch {
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}