/*
  Warnings:

  - You are about to drop the column `anio` on the `movimientos` table. All the data in the column will be lost.
  - You are about to drop the column `correlativo` on the `movimientos` table. All the data in the column will be lost.
  - You are about to drop the column `plantilla` on the `tipos_documento` table. All the data in the column will be lost.
  - You are about to drop the column `anio` on the `tramites` table. All the data in the column will be lost.
  - You are about to drop the column `correlativo` on the `tramites` table. All the data in the column will be lost.
  - You are about to drop the `documento_correlativos` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `numeroDocumento` to the `tramites` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."documento_correlativos" DROP CONSTRAINT "documento_correlativos_oficinaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."documento_correlativos" DROP CONSTRAINT "documento_correlativos_tipoDocumentoId_fkey";

-- AlterTable
ALTER TABLE "public"."movimientos" DROP COLUMN "anio",
DROP COLUMN "correlativo",
ADD COLUMN     "numeroDocumento" TEXT;

-- AlterTable
ALTER TABLE "public"."tipos_documento" DROP COLUMN "plantilla";

-- AlterTable
ALTER TABLE "public"."tramites" DROP COLUMN "anio",
DROP COLUMN "correlativo",
ADD COLUMN     "numeroDocumento" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."documento_correlativos";
