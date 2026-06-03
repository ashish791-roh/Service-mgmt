-- CreateTable
CREATE TABLE "TallySyncSetting" (
    "id" TEXT NOT NULL DEFAULT 'tally-sync-settings',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "host" TEXT NOT NULL DEFAULT 'localhost',
    "port" INTEGER NOT NULL DEFAULT 9000,
    "companyName" TEXT NOT NULL DEFAULT '',
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "mockMode" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallySyncSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyLedger" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mappedName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyStockItem" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "inventoryId" TEXT,
    "mappedName" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallyStockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TallyDocument" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "mappedLedger" JSONB,
    "mappedStock" JSONB,
    "voucherType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "xmlPayload" TEXT,
    "tallyResponse" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TallyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TallyDocument_ownerId_idx" ON "TallyDocument"("ownerId");

-- AddForeignKey
ALTER TABLE "TallyDocument" ADD CONSTRAINT "TallyDocument_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
