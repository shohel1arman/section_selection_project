-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Selection" (
    "id" TEXT NOT NULL,
    "studentRowId" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "labSubsection" TEXT,

    CONSTRAINT "Selection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionCount" (
    "id" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "labSubsection" TEXT,
    "capacity" INTEGER NOT NULL,
    "taken" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SectionCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Selection_courseCode_section_labSubsection_idx" ON "Selection"("courseCode", "section", "labSubsection");

-- CreateIndex
CREATE UNIQUE INDEX "Selection_studentRowId_courseCode_key" ON "Selection"("studentRowId", "courseCode");

-- CreateIndex
CREATE UNIQUE INDEX "SectionCount_courseCode_section_labSubsection_key" ON "SectionCount"("courseCode", "section", "labSubsection");

-- AddForeignKey
ALTER TABLE "Selection" ADD CONSTRAINT "Selection_studentRowId_fkey" FOREIGN KEY ("studentRowId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
