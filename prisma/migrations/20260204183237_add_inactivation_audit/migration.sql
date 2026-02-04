-- AlterTable
ALTER TABLE "users" ADD COLUMN     "inactivatedAt" TIMESTAMP(3),
ADD COLUMN     "inactivatedById" TEXT;
