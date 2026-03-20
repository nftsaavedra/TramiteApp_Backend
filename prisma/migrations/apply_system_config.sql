-- ========================================
-- APLICAR MIGRACIÓN DE SYSTEM_CONFIG
-- ========================================
-- Ejecutar este script en pgAdmin o herramienta PostgreSQL
-- Fecha: March 20, 2026
-- Descripción: Crea tabla system_config y actualiza enums
-- ========================================

BEGIN;

-- Paso 1: Agregar nuevos valores al enum Role (si no existen)
DO $$ BEGIN
    ALTER TYPE "Role" ADD VALUE 'USER';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "Role" ADD VALUE 'SUPERUSER';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Paso 2: Crear tabla system_config (si no existe)
CREATE TABLE IF NOT EXISTS "system_config" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "rootOfficeName" TEXT NOT NULL DEFAULT 'Viceministerio de Planificación e Inversión',
    "rootOfficeSiglas" TEXT NOT NULL DEFAULT 'VPIN',
    "defaultRole" "Role" NOT NULL DEFAULT 'RECEPCIONISTA',
    "isInitialized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- Paso 3: Verificar que se creó correctamente
SELECT 
    id,
    rootOfficeName,
    rootOfficeSiglas,
    "defaultRole",
    "isInitialized",
    "createdAt",
    "updatedAt"
FROM system_config
WHERE id = 'main';

COMMIT;

-- Mensaje de confirmación
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla system_config creada exitosamente'
        ELSE '⚠️ Error: Tabla no fue creada'
    END as estado
FROM system_config
WHERE id = 'main';
