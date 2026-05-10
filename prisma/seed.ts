import { PrismaClient } from "@prisma/client";
import {
  COURSES,
  SECTIONS,
  LAB_SUBSECTIONS,
  THEORY_CAPACITY,
  LAB_CAPACITY,
} from "../lib/courses";

const prisma = new PrismaClient();

async function main() {
  // Build the desired set of (course, section, sub) slots.
  type Slot = {
    courseCode: string;
    section: string;
    labSubsection: string | null;
    capacity: number;
  };
  const desired: Slot[] = [];
  for (const course of COURSES) {
    for (const section of SECTIONS) {
      if (course.type === "theory") {
        desired.push({
          courseCode: course.code,
          section,
          labSubsection: null,
          capacity: THEORY_CAPACITY,
        });
      } else {
        for (const sub of LAB_SUBSECTIONS) {
          desired.push({
            courseCode: course.code,
            section,
            labSubsection: sub,
            capacity: LAB_CAPACITY,
          });
        }
      }
    }
  }

  // Idempotent seed: ensure each desired slot exists with the right capacity.
  // We use findFirst + create/update because Prisma's compound-unique input
  // doesn't accept nulls cleanly for optional columns.
  for (const slot of desired) {
    const existing = await prisma.sectionCount.findFirst({
      where: {
        courseCode: slot.courseCode,
        section: slot.section,
        labSubsection: slot.labSubsection,
      },
    });
    if (existing) {
      if (existing.capacity !== slot.capacity) {
        await prisma.sectionCount.update({
          where: { id: existing.id },
          data: { capacity: slot.capacity },
        });
      }
    } else {
      await prisma.sectionCount.create({ data: slot });
    }
  }

  const count = await prisma.sectionCount.count();
  console.log(`Seeded ${count} section_count rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
