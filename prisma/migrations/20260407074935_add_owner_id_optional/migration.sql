-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "owner_id" INTEGER;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
