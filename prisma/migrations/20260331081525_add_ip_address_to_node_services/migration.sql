/*
  Warnings:

  - Added the required column `node_service_ip_address` to the `node_services` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "node_services" ADD COLUMN     "node_service_ip_address" TEXT NOT NULL;
