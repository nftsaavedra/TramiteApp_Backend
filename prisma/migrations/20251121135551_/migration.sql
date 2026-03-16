/*
  Warnings:

  - The values [ABIERTO,CERRADO] on the enum `EstadoTramite` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."EstadoTramite_new" AS ENUM ('EN_PROCESO', 'FINALIZADO', 'ARCHIVADO');
ALTER TABLE "public"."tramites" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "public"."tramites" ALTER COLUMN "estado" TYPE "public"."EstadoTramite_new" USING ("estado"::text::"public"."EstadoTramite_new");
ALTER TYPE "public"."EstadoTramite" RENAME TO "EstadoTramite_old";
ALTER TYPE "public"."EstadoTramite_new" RENAME TO "EstadoTramite";
DROP TYPE "public"."EstadoTramite_old";
ALTER TABLE "public"."tramites" ALTER COLUMN "estado" SET DEFAULT 'EN_PROCESO';
COMMIT;

-- AlterTable
ALTER TABLE "public"."tramites" ALTER COLUMN "estado" SET DEFAULT 'EN_PROCESO';
