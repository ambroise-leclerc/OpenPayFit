-- CreateTable
CREATE TABLE "accounting_integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "configuration" TEXT NOT NULL,
    "lastSyncAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounting_integrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounting_export_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payPeriod" TEXT,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "filePath" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "accounting_export_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "accounting_integrations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "accounting_integrations_companyId_type_key" ON "accounting_integrations"("companyId", "type");

-- CreateIndex
CREATE INDEX "accounting_export_logs_integrationId_idx" ON "accounting_export_logs"("integrationId");

-- CreateIndex
CREATE INDEX "accounting_export_logs_status_idx" ON "accounting_export_logs"("status");
