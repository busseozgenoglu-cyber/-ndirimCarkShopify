-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "CarkAyar" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "veri" TEXT NOT NULL,
    "guncellendi" DATETIME NOT NULL,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Katilimci" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "eposta" TEXT NOT NULL,
    "epostaHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "dilimId" TEXT NOT NULL,
    "dilimAdi" TEXT NOT NULL,
    "kazandi" BOOLEAN NOT NULL DEFAULT false,
    "kod" TEXT,
    "kodTipi" TEXT,
    "kodDegeri" TEXT,
    "sonKullanma" DATETIME,
    "pazarlamaIzni" BOOLEAN NOT NULL DEFAULT false,
    "musteriId" TEXT,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HizSayaci" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "olusturuldu" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- CreateIndex
CREATE INDEX "Katilimci_shop_olusturuldu_idx" ON "Katilimci"("shop", "olusturuldu");

-- CreateIndex
CREATE INDEX "Katilimci_shop_epostaHash_idx" ON "Katilimci"("shop", "epostaHash");

-- CreateIndex
CREATE INDEX "Katilimci_shop_ipHash_idx" ON "Katilimci"("shop", "ipHash");

-- CreateIndex
CREATE INDEX "HizSayaci_shop_anahtar_olusturuldu_idx" ON "HizSayaci"("shop", "anahtar", "olusturuldu");

