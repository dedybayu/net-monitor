-- CreateTable
CREATE TABLE "proxmox" (
    "proxmox_id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "proxmox_connection_name" TEXT NOT NULL,
    "proxmox_description" TEXT,
    "proxmox_host" TEXT NOT NULL,
    "proxmox_port" INTEGER NOT NULL DEFAULT 8006,
    "proxmox_username" TEXT NOT NULL,
    "proxmox_token_name" TEXT NOT NULL,
    "proxmox_token_secret" TEXT NOT NULL,
    "proxmox_is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proxmox_pkey" PRIMARY KEY ("proxmox_id")
);

-- AddForeignKey
ALTER TABLE "proxmox" ADD CONSTRAINT "proxmox_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;
