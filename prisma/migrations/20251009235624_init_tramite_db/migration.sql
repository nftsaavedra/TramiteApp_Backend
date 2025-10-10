-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('RECEPCIONISTA', 'ANALISTA', 'ASESORIA', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."EstadoTramite" AS ENUM ('ABIERTO', 'CERRADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "public"."PrioridadTramite" AS ENUM ('BAJA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "public"."TipoAccion" AS ENUM ('DERIVACION', 'RESPUESTA', 'ASIGNACION', 'ARCHIVO', 'CIERRE');

-- CreateEnum
CREATE TYPE "public"."TipoDestino" AS ENUM ('PRINCIPAL', 'COPIA');

-- CreateEnum
CREATE TYPE "public"."EstadoDestino" AS ENUM ('PENDIENTE', 'RECIBIDO', 'ATENDIDO');

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
    "tipo" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oficinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tipos_documento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "plantilla" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documento_correlativos" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "correlativo" INTEGER NOT NULL DEFAULT 0,
    "oficinaId" TEXT NOT NULL,
    "tipoDocumentoId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documento_correlativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tramites" (
    "id" TEXT NOT NULL,
    "numeroDocumentoCompleto" TEXT NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "asunto" TEXT NOT NULL,
    "notas" TEXT,
    "observaciones" TEXT,
    "estado" "public"."EstadoTramite" NOT NULL DEFAULT 'ABIERTO',
    "prioridad" "public"."PrioridadTramite" NOT NULL DEFAULT 'NORMAL',
    "fechaDocumento" TIMESTAMP(3) NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tipoDocumentoId" TEXT NOT NULL,
    "oficinaRemitenteId" TEXT NOT NULL,
    "usuarioAsignadoId" TEXT,

    CONSTRAINT "tramites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movimientos" (
    "id" TEXT NOT NULL,
    "tipoAccion" "public"."TipoAccion" NOT NULL,
    "numeroDocumentoCompleto" TEXT,
    "correlativo" INTEGER,
    "anio" INTEGER,
    "fechaDocumento" TIMESTAMP(3),
    "tipoDocumentoId" TEXT,
    "notas" TEXT,
    "observaciones" TEXT,
    "fechaCierre" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tramiteId" TEXT NOT NULL,
    "usuarioCreadorId" TEXT NOT NULL,
    "oficinaOrigenId" TEXT NOT NULL,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."movimiento_destinos" (
    "id" TEXT NOT NULL,
    "tipoDestino" "public"."TipoDestino" NOT NULL DEFAULT 'PRINCIPAL',
    "fechaRecepcion" TIMESTAMP(3),
    "estado" "public"."EstadoDestino" NOT NULL DEFAULT 'PENDIENTE',
    "movimientoId" TEXT NOT NULL,
    "oficinaDestinoId" TEXT NOT NULL,

    CONSTRAINT "movimiento_destinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."anotaciones" (
    "id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tramiteId" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "oficinas_nombre_key" ON "public"."oficinas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "oficinas_siglas_key" ON "public"."oficinas"("siglas");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_documento_nombre_key" ON "public"."tipos_documento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "documento_correlativos_anio_oficinaId_tipoDocumentoId_key" ON "public"."documento_correlativos"("anio", "oficinaId", "tipoDocumentoId");

-- CreateIndex
CREATE UNIQUE INDEX "feriados_fecha_key" ON "public"."feriados"("fecha");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "public"."oficinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documento_correlativos" ADD CONSTRAINT "documento_correlativos_oficinaId_fkey" FOREIGN KEY ("oficinaId") REFERENCES "public"."oficinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documento_correlativos" ADD CONSTRAINT "documento_correlativos_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "public"."tipos_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tramites" ADD CONSTRAINT "tramites_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "public"."tipos_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tramites" ADD CONSTRAINT "tramites_oficinaRemitenteId_fkey" FOREIGN KEY ("oficinaRemitenteId") REFERENCES "public"."oficinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tramites" ADD CONSTRAINT "tramites_usuarioAsignadoId_fkey" FOREIGN KEY ("usuarioAsignadoId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimientos" ADD CONSTRAINT "movimientos_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "public"."tipos_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimientos" ADD CONSTRAINT "movimientos_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "public"."tramites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimientos" ADD CONSTRAINT "movimientos_usuarioCreadorId_fkey" FOREIGN KEY ("usuarioCreadorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimientos" ADD CONSTRAINT "movimientos_oficinaOrigenId_fkey" FOREIGN KEY ("oficinaOrigenId") REFERENCES "public"."oficinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimiento_destinos" ADD CONSTRAINT "movimiento_destinos_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "public"."movimientos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."movimiento_destinos" ADD CONSTRAINT "movimiento_destinos_oficinaDestinoId_fkey" FOREIGN KEY ("oficinaDestinoId") REFERENCES "public"."oficinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."anotaciones" ADD CONSTRAINT "anotaciones_tramiteId_fkey" FOREIGN KEY ("tramiteId") REFERENCES "public"."tramites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."anotaciones" ADD CONSTRAINT "anotaciones_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
