-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "type" TEXT NOT NULL DEFAULT 'TASK',
    "timeLogged" REAL NOT NULL DEFAULT 0.0,
    "startDate" DATETIME,
    "dueDate" DATETIME,
    "projectId" TEXT NOT NULL,
    "sprintId" TEXT,
    "previousSprints" TEXT,
    "storyId" TEXT,
    "parentTicketId" TEXT,
    "assigneeId" TEXT,
    "reporterId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tickets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tickets_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "sprints" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tickets_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tickets_parentTicketId_fkey" FOREIGN KEY ("parentTicketId") REFERENCES "tickets" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tickets_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_tickets" ("assigneeId", "createdAt", "createdById", "description", "dueDate", "id", "previousSprints", "priority", "projectId", "reporterId", "sprintId", "startDate", "status", "storyId", "timeLogged", "title", "type", "updatedAt") SELECT "assigneeId", "createdAt", "createdById", "description", "dueDate", "id", "previousSprints", "priority", "projectId", "reporterId", "sprintId", "startDate", "status", "storyId", "timeLogged", "title", "type", "updatedAt" FROM "tickets";
DROP TABLE "tickets";
ALTER TABLE "new_tickets" RENAME TO "tickets";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
