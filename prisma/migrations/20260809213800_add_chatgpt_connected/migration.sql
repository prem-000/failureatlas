-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "chatgptConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "chatgptConnectedAt" TIMESTAMP(3);
