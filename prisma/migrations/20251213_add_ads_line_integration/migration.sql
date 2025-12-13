-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "adsLineNotifyToken" TEXT,
ADD COLUMN     "adsLineChannelAccessToken" TEXT,
ADD COLUMN     "adsLineChannelSecret" TEXT,
ADD COLUMN     "adsLineWebhookUrl" TEXT;
