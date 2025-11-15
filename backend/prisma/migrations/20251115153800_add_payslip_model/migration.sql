-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payPeriod" TEXT NOT NULL,
    "grossSalary" REAL NOT NULL,
    "deductions" REAL NOT NULL,
    "netSalary" REAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_employeeId_payPeriod_key" ON "Payslip"("employeeId", "payPeriod");
