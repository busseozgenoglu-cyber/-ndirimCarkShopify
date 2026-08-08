-- shopify-api v13 oturumları refreshToken / refreshTokenExpires alanlarını yazar.
-- Eksik kolonlar PrismaClientValidationError (HTTP 500 /app) hatasına yol açıyordu.
ALTER TABLE "Session" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "Session" ADD COLUMN "refreshTokenExpires" TIMESTAMP(3);
