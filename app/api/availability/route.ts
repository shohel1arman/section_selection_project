import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const rows = await prisma.sectionCount.findMany({
    orderBy: [
      { courseCode: "asc" },
      { section: "asc" },
      { labSubsection: "asc" },
    ],
  });
  return NextResponse.json(
    {
      slots: rows.map((r) => ({
        courseCode: r.courseCode,
        section: r.section,
        labSubsection: r.labSubsection,
        capacity: r.capacity,
        taken: r.taken,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
