import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ADMIN_COOKIE_NAME, verifySessionCookie } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookie = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifySessionCookie(cookie))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const students = await prisma.student.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      selections: {
        orderBy: { courseCode: "asc" },
      },
    },
  });

  const counts = await prisma.sectionCount.findMany({
    orderBy: [
      { courseCode: "asc" },
      { section: "asc" },
      { labSubsection: "asc" },
    ],
  });

  return NextResponse.json(
    { students, counts },
    { headers: { "Cache-Control": "no-store" } },
  );
}
