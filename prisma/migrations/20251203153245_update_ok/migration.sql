/*
  Warnings:

  - You are about to drop the column `numeroDocumentoCompleto` on the `movimientos` table. All the data in the column will be lost.
  - You are about to drop the column `notas` on the `tramites` table. All the data in the column will be lost.
  - You are about to drop the column `numeroDocumentoCompleto` on the `tramites` table. All the data in the column will be lost.
  - You are about to drop the `movimiento_destinos` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `nombreDocumentoCompleto` to the `tramites` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."movimiento_destinos" DROP CONSTRAINT "movimiento_destinos_movimientoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."movimiento_destinos" DROP CONSTRAINT "movimiento_destinos_oficinaDestinoId_fkey";

-- AlterTable
ALTER TABLE "public"."anotaciones" ADD COLUMN     "movimientoId" TEXT;

-- AlterTable
ALTER TABLE "public"."movimientos" DROP COLUMN "numeroDocumentoCompleto",
ADD COLUMN     "asunto" TEXT,
ADD COLUMN     "esCopia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nombreDocumentoCompleto" TEXT,
ADD COLUMN     "oficinaDestinoId" TEXT;

-- AlterTable
ALTER TABLE "public"."tramites" DROP COLUMN "notas",
DROP COLUMN "numeroDocumentoCompleto",
ADD COLUMN     "nombreDocumentoCompleto" TEXT NOT NULL,
ADD COLUMN     "oficinaDestinoId" TEXT;

-- DropTable
DROP TABLE "public"."movimiento_destinos";

-- DropEnum
DROP TYPE "public"."EstadoDestino";

-- DropEnum
DROP TYPE "public"."TipoDestino";

-- CreateTable
CREATE TABLE "public"."_TramiteCopias" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TramiteCopias_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TramiteCopias_B_index" ON "public"."_TramiteCopias"("B");

-- AddForeignKey
ALTER TABLE "public"."tramites" ADD CONSTRAINT "tramites_oficinaDestinoId_fkey" FOREIGN KEY ("oficinaDestinoId") REFERENCES "public"."oficinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimientos" ADD CONSTRAINT "movimientos_oficinaDestinoId_fkey" FOREIGN KEY ("oficinaDestinoId") REFERENCES "public"."oficinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."anotaciones" ADD CONSTRAINT "anotaciones_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "public"."movimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TramiteCopias" ADD CONSTRAINT "_TramiteCopias_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."oficinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TramiteCopias" ADD CONSTRAINT "_TramiteCopias_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."tramites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
