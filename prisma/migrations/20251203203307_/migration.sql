/*
  Warnings:

  - The values [DERIVACION,RESPUESTA,ASIGNACION,ARCHIVO,CIERRE] on the enum `TipoAccion` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."TipoAccion_new" AS ENUM ('ENVIO', 'RECEPCION');
ALTER TABLE "public"."movimientos" ALTER COLUMN "tipoAccion" TYPE "public"."TipoAccion_new" USING ("tipoAccion"::text::"public"."TipoAccion_new");
ALTER TYPE "public"."TipoAccion" RENAME TO "TipoAccion_old";
ALTER TYPE "public"."TipoAccion_new" RENAME TO "TipoAccion";
DROP TYPE "public"."TipoAccion_old";
COMMIT;
