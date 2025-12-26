-- DropIndex
DROP INDEX IF EXISTS "User_clerkId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "clerkId";
