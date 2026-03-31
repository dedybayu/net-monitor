/*
  Warnings:

  - A unique constraint covering the columns `[workspace_id,node_react_id]` on the table `nodes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "nodes_workspace_id_node_react_id_key" ON "nodes"("workspace_id", "node_react_id");
