-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('RECEPCIONISTA', 'ANALISTA', 'ASESORIA', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."TipoOficina" AS ENUM ('ORGANO_ALTA_DIRECCION', 'ORGANO_DE_LINEA', 'UNIDAD_ORGANICA', 'ORGANO_DE_ASESORAMIENTO', 'ORGANO_DE_APOYO', 'EXTERNA');

-- CreateEnum
CREATE TYPE "public"."EstadoTramite" AS ENUM ('EN_PROCESO', 'FINALIZADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "public"."PrioridadTramite" AS ENUM ('BAJA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "public"."TipoAccion" AS ENUM ('ENVIO', 'RECEPCION');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'RECEPCIONISTA',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "oficinaId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oficinas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "siglas" TEXT NOT NULL,
    "tipo" "public"."TipoOficina" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,
    "esInquilino" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "oficinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tipos_documento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tramites" (
    "id" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "nombreDocumentoCompleto" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "observaciones" TEXT,
    "estado" "public"."EstadoTramite" NOT NULL DEFAULT 'EN_PROCESO',
    "prioridad" "public"."PrioridadTramite" NOT NULL DEFAULT 'NORMAL',
    "fechaRecepcion" TIMESTAMP(3) NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tipoDocumentoId" TEXT NOT NULL,
    "oficinaRemitenteId" TEXT NOT NULL,
    "oficinaDestinoId" TEXT,
    "usuarioAsignadoId" TEXT,

    CONSTRAINT "tramites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movimientos" (
    "id" TEXT NOT NULL,
    "tipoAccion" "public"."TipoAccion" NOT NULL,
    "numeroDocumento" TEXT,
    "nombreDocumentoCompleto" TEXT,
    "asunto" TEXT,
    "fechaRecepcion" TIMESTAMP(3),
    "notas" TEXT,
    "observaciones" TEXT,
    "esCopia" BOOLEAN NOT NULL DEFAULT false,
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fechaMovimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tramiteId" TEXT NOT NULL,
    "usuarioCreadorId" TEXT NOT NULL,
    "oficinaOrigenId" TEXT NOT NULL,
    "oficinaDestinoId" TEXT,
    "tipoDocumentoId" TEXT,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."anotaciones" (
    "id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tramiteId" TEXT NOT NULL,
    "movimientoId" TEXT,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "anotaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feriados" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "feriados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_TramiteCopias" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TramiteCopias_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "oficinas_nombre_key" ON "public"."oficinas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "oficinas_siglas_key" ON "public"."oficinas"("siglas");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_documento_nombre_key" ON "public"."tipos_documento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "feriados_fecha_key" ON "public"."feriados"("fecha");

-- CreateIndex
CREATE INDEX "_TramiteCopias_B_index" ON "public"."_TramiteCopias"("B");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "public"."oficinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oficinas" ADD CONSTRAINT "oficinas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."oficinas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."tramites" ADD CONSTRAINT "tramites_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "public"."tipos_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tramites" ADD CONSTRAINT "tramites_oficinaRemitenteId_fkey" FOREIGN KEY ("oficinaRemitenteId") REFERENCES "public"."oficinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tramites" ADD CONSTRAINT "tramites_oficinaDestinoId_fkey" FOREIGN KEY ("oficinaDestinoId") REFERENCES "public"."oficinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tramites" ADD CONSTRAINT "tramites_usuarioAsignadoId_fkey" FOREIGN KEY ("usuarioAsignadoId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimientos" ADD CONSTRAINT "movimientos_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "public"."tramites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimientos" ADD CONSTRAINT "movimientos_usuarioCreadorId_fkey" FOREIGN KEY ("usuarioCreadorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimientos" ADD CONSTRAINT "movimientos_oficinaOrigenId_fkey" FOREIGN KEY ("oficinaOrigenId") REFERENCES "public"."oficinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimientos" ADD CONSTRAINT "movimientos_oficinaDestinoId_fkey" FOREIGN KEY ("oficinaDestinoId") REFERENCES "public"."oficinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimientos" ADD CONSTRAINT "movimientos_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "public"."tipos_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."anotaciones" ADD CONSTRAINT "anotaciones_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "public"."tramites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."anotaciones" ADD CONSTRAINT "anotaciones_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "public"."movimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."anotaciones" ADD CONSTRAINT "anotaciones_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TramiteCopias" ADD CONSTRAINT "_TramiteCopias_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."oficinas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_TramiteCopias" ADD CONSTRAINT "_TramiteCopias_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."tramites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
