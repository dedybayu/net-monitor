/*
  Warnings:

  - Made the column `workspace_description` on table `workspaces` required. This step will fail if there are existing NULL values in that column.
  - Made the column `owner_id` on table `workspaces` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_owner_id_fkey";

-- AlterTable
ALTER TABLE "workspaces" ALTER COLUMN "workspace_description" SET NOT NULL,
ALTER COLUMN "owner_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
