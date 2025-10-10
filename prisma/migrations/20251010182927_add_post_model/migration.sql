/*
  Warnings:

  - Changed the type of `tipo` on the `oficinas` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."TipoOficina" AS ENUM ('ORGANO_ALTA_DIRECCION', 'ORGANO_DE_LINEA', 'UNIDAD_ORGANICA', 'ORGANO_DE_ASESORAMIENTO', 'ORGANO_DE_APOYO', 'EXTERNA');

-- AlterTable
ALTER TABLE "public"."oficinas" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "public"."TipoOficina" NOT NULL;
