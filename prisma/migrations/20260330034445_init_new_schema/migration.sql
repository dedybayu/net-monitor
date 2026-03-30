-- CreateTable
CREATE TABLE "levels" (
    "level_id" SERIAL NOT NULL,
    "level_name" TEXT NOT NULL,
    "level_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("level_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "level_id" INTEGER NOT NULL,
    "profile_picture" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_workspaces" (
    "user_workspace_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "permision" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_workspaces_pkey" PRIMARY KEY ("user_workspace_id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "workspace_id" SERIAL NOT NULL,
    "workspace_name" TEXT NOT NULL,
    "workspace_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("workspace_id")
);

-- CreateTable
CREATE TABLE "nodes" (
    "node_id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "node_react_id" TEXT NOT NULL,
    "node_type" TEXT NOT NULL DEFAULT 'monitor',
    "node_posX" DOUBLE PRECISION NOT NULL,
    "node_posY" DOUBLE PRECISION NOT NULL,
    "node_label" TEXT NOT NULL,
    "node_description" TEXT,
    "node_ip_address" TEXT NOT NULL,
    "node_method" TEXT NOT NULL DEFAULT 'ICMP',
    "node_port" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("node_id")
);

-- CreateTable
CREATE TABLE "edges" (
    "edge_id" SERIAL NOT NULL,
    "workspace_id" INTEGER NOT NULL,
    "source_react_id" TEXT NOT NULL,
    "target_react_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edges_pkey" PRIMARY KEY ("edge_id")
);

-- CreateTable
CREATE TABLE "node_services" (
    "node_service_id" SERIAL NOT NULL,
    "node_id" INTEGER NOT NULL,
    "node_service_name" TEXT NOT NULL,
    "node_service_description" TEXT,
    "node_service_method" TEXT NOT NULL,
    "node_service_port" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_services_pkey" PRIMARY KEY ("node_service_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "levels_level_code_key" ON "levels"("level_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("level_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_workspaces" ADD CONSTRAINT "user_workspaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_workspaces" ADD CONSTRAINT "user_workspaces_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edges" ADD CONSTRAINT "edges_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_services" ADD CONSTRAINT "node_services_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("node_id") ON DELETE RESTRICT ON UPDATE CASCADE;
