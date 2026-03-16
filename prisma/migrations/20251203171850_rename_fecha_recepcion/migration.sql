/*
  Warnings:

  - You are about to drop the column `fechaDocumento` on the `tramites` table. All the data in the column will be lost.
  - Added the required column `fechaRecepcion` to the `tramites` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tramites" RENAME COLUMN "fechaDocumento" TO "fechaRecepcion";
