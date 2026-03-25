-- AlterTable
ALTER TABLE "system_config" ALTER COLUMN "defaultRole" SET DEFAULT 'USER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
