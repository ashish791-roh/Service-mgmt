const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  // Read .env file for DATABASE_URL
  const envPath = path.join(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (!match) {
    console.error('Could not find DATABASE_URL in .env');
    process.exit(1);
  }
  const connectionString = match[1];

  console.log('Connecting to database...');
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected!');

  const sql = `
    CREATE TABLE IF NOT EXISTS "Supplier" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "phone" TEXT,
      "email" TEXT,
      "address" TEXT,
      "gstin" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "Expense" (
      "id" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "category" TEXT NOT NULL,
      "paymentMethod" TEXT NOT NULL,
      "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "Purchase" (
      "id" TEXT NOT NULL,
      "purchaseNumber" TEXT NOT NULL,
      "supplierId" TEXT,
      "supplierName" TEXT NOT NULL,
      "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_purchaseNumber_key" ON "Purchase"("purchaseNumber");

    CREATE TABLE IF NOT EXISTS "PurchaseItem" (
      "id" TEXT NOT NULL,
      "purchaseId" TEXT NOT NULL,
      "inventoryItemId" TEXT NOT NULL,
      "itemName" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "unitPrice" DOUBLE PRECISION NOT NULL,
      "subtotal" DOUBLE PRECISION NOT NULL,
      CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "TallyQueueItem" (
      "id" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "actionType" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "priority" INTEGER NOT NULL DEFAULT 0,
      "retryCount" INTEGER NOT NULL DEFAULT 0,
      "maxRetries" INTEGER NOT NULL DEFAULT 5,
      "errorMessage" TEXT,
      "xmlPayload" TEXT,
      "tallyResponse" TEXT,
      "nextRetryAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "metadata" JSONB,
      CONSTRAINT "TallyQueueItem_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "TallyQueueItem_status_idx" ON "TallyQueueItem"("status");
    CREATE INDEX IF NOT EXISTS "TallyQueueItem_nextRetryAt_idx" ON "TallyQueueItem"("nextRetryAt");
    CREATE INDEX IF NOT EXISTS "TallyQueueItem_entityType_entityId_idx" ON "TallyQueueItem"("entityType", "entityId");

    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "gstin" TEXT;

    CREATE TABLE IF NOT EXISTS "BusinessSettings" (
      "id" TEXT NOT NULL DEFAULT 'business-settings',
      "shopName" TEXT NOT NULL DEFAULT 'FixHub',
      "tagline" TEXT NOT NULL DEFAULT 'Device Repair & Service Centre',
      "address" TEXT NOT NULL DEFAULT '123 Main Street, Sector 5, Bangalore, Karnataka - 560001',
      "phone" TEXT NOT NULL DEFAULT '+91 98765 43210',
      "email" TEXT NOT NULL DEFAULT 'support@fixhub.com',
      "gstin" TEXT NOT NULL DEFAULT '29ABCDE1234F1Z5',
      "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
      "taxLabel" TEXT NOT NULL DEFAULT 'GST',
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE IF NOT EXISTS "Branch" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "apiKey" TEXT NOT NULL,
      "suspended" BOOLEAN NOT NULL DEFAULT FALSE,
      "lastSeen" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "Branch_apiKey_key" ON "Branch"("apiKey");

    CREATE TABLE IF NOT EXISTS "SyncOutbox" (
      "id" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "payload" JSONB NOT NULL,
      "seq" BIGSERIAL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "processed" BOOLEAN NOT NULL DEFAULT FALSE,
      CONSTRAINT "SyncOutbox_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "SyncOutbox_processed_seq_idx" ON "SyncOutbox"("processed", "seq");
    CREATE INDEX IF NOT EXISTS "SyncOutbox_entityType_entityId_idx" ON "SyncOutbox"("entityType", "entityId");

    CREATE TABLE IF NOT EXISTS "SyncOutboxLedger" (
      "id" TEXT NOT NULL,
      "branchId" TEXT NOT NULL,
      "lastSeq" BIGINT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SyncOutboxLedger_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "SyncOutboxLedger_branchId_key" ON "SyncOutboxLedger"("branchId");

    CREATE TABLE IF NOT EXISTS "ConfigDirective" (
      "id" TEXT NOT NULL,
      "directiveType" TEXT NOT NULL,
      "payload" JSONB NOT NULL,
      "seq" BIGSERIAL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ConfigDirective_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "ConfigDirective_seq_idx" ON "ConfigDirective"("seq");

    CREATE TABLE IF NOT EXISTS "ConfigSyncState" (
      "id" TEXT NOT NULL DEFAULT 'config-sync-state',
      "lastSeq" BIGINT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ConfigSyncState_pkey" PRIMARY KEY ("id")
    );

    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "JobActivity" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "JobPhoto" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "PartRequest" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "PurchaseItem" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "TallyQueueItem" ADD COLUMN IF NOT EXISTS "branchId" TEXT NOT NULL DEFAULT 'default';

    CREATE INDEX IF NOT EXISTS "User_branchId_idx" ON "User"("branchId");
    CREATE INDEX IF NOT EXISTS "Customer_branchId_idx" ON "Customer"("branchId");
    CREATE INDEX IF NOT EXISTS "Device_branchId_idx" ON "Device"("branchId");
    CREATE INDEX IF NOT EXISTS "Job_branchId_idx" ON "Job"("branchId");
    CREATE INDEX IF NOT EXISTS "JobActivity_branchId_idx" ON "JobActivity"("branchId");
    CREATE INDEX IF NOT EXISTS "JobPhoto_branchId_idx" ON "JobPhoto"("branchId");
    CREATE INDEX IF NOT EXISTS "PartRequest_branchId_idx" ON "PartRequest"("branchId");
    CREATE INDEX IF NOT EXISTS "Payment_branchId_idx" ON "Payment"("branchId");
    CREATE INDEX IF NOT EXISTS "InventoryItem_branchId_idx" ON "InventoryItem"("branchId");
    CREATE INDEX IF NOT EXISTS "Notification_branchId_idx" ON "Notification"("branchId");
    CREATE INDEX IF NOT EXISTS "Sale_branchId_idx" ON "Sale"("branchId");
    CREATE INDEX IF NOT EXISTS "SaleItem_branchId_idx" ON "SaleItem"("branchId");
    CREATE INDEX IF NOT EXISTS "Supplier_branchId_idx" ON "Supplier"("branchId");
    CREATE INDEX IF NOT EXISTS "Expense_branchId_idx" ON "Expense"("branchId");
    CREATE INDEX IF NOT EXISTS "Purchase_branchId_idx" ON "Purchase"("branchId");
    CREATE INDEX IF NOT EXISTS "PurchaseItem_branchId_idx" ON "PurchaseItem"("branchId");
    CREATE INDEX IF NOT EXISTS "TallyQueueItem_branchId_idx" ON "TallyQueueItem"("branchId");
  `;

  try {
    await client.query(sql);
    console.log('Tables created successfully!');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    await client.end();
  }
}

run();
