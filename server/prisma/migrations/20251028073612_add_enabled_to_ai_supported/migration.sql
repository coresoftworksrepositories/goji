-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ai_supported_teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "teamId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ai_supported_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ai_supported_teams" ("createdAt", "id", "teamId", "updatedAt") SELECT "createdAt", "id", "teamId", "updatedAt" FROM "ai_supported_teams";
DROP TABLE "ai_supported_teams";
ALTER TABLE "new_ai_supported_teams" RENAME TO "ai_supported_teams";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
