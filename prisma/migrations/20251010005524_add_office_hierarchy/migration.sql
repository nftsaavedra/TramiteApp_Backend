-- AlterTable
ALTER TABLE "public"."oficinas" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."oficinas" ADD CONSTRAINT "oficinas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."oficinas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
