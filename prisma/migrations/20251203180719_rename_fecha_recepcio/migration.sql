/*
  Warnings:

  - You are about to drop the column `fechaDocumento` on the `movimientos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."movimientos" DROP COLUMN "fechaDocumento",
ADD COLUMN     "fechaRecepcion" TIMESTAMP(3);
