-- CreateTable
CREATE TABLE "expense_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "expense_reports_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expense_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "receiptPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "expense_items_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "expense_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "expense_reports_employeeId_idx" ON "expense_reports"("employeeId");

-- CreateIndex
CREATE INDEX "expense_reports_status_idx" ON "expense_reports"("status");

-- CreateIndex
CREATE INDEX "expense_items_reportId_idx" ON "expense_items"("reportId");

-- CreateIndex
CREATE INDEX "expense_items_date_idx" ON "expense_items"("date");
