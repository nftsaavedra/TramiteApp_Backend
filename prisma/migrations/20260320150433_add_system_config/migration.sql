-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'USER';
ALTER TYPE "Role" ADD VALUE 'SUPERUSER';

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "rootOfficeName" TEXT NOT NULL DEFAULT 'Viceministerio de Planificación e Inversión',
    "rootOfficeSiglas" TEXT NOT NULL DEFAULT 'VPIN',
    "defaultRole" "Role" NOT NULL DEFAULT 'RECEPCIONISTA',
    "isInitialized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);
