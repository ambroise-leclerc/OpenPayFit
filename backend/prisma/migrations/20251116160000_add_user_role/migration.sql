-- CreateEnum
CREATE TABLE "_prisma_new_Role" (
    "name" TEXT NOT NULL PRIMARY KEY
);

INSERT INTO "_prisma_new_Role" VALUES ('USER');
INSERT INTO "_prisma_new_Role" VALUES ('ADMIN');

-- AlterTable User: Add role column with default value USER
PRAGMA foreign_keys=off;
CREATE TABLE "_prisma_new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copy existing data
INSERT INTO "_prisma_new_User" ("id", "email", "name", "password", "createdAt", "updatedAt")
SELECT "id", "email", "name", "password", "createdAt", "updatedAt" FROM "User";

-- Drop old table
DROP TABLE "User";

-- Rename new table
ALTER TABLE "_prisma_new_User" RENAME TO "User";

-- Recreate unique index
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_keys=on;
