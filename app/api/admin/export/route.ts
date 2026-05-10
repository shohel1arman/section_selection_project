import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ADMIN_COOKIE_NAME, verifySessionCookie } from "@/lib/adminSession";
import { COURSES } from "@/lib/courses";

export const dynamic = "force-dynamic";

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const cookie = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifySessionCookie(cookie))) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const students = await prisma.student.findMany({
    orderBy: { createdAt: "asc" },
    include: { selections: true },
  });

  const header = [
    "student_id",
    "name",
    "email",
    "submitted_at",
    ...COURSES.map((c) => c.code),
  ];
  const rows: string[] = [header.map(csvEscape).join(",")];

  for (const s of students) {
    const byCourse = new Map<string, string>();
    for (const sel of s.selections) {
      byCourse.set(
        sel.courseCode,
        sel.labSubsection
          ? `${sel.section}${sel.labSubsection}`
          : sel.section,
      );
    }
    rows.push(
      [
        s.studentId,
        s.name,
        s.email,
        s.createdAt.toISOString(),
        ...COURSES.map((c) => byCourse.get(c.code) ?? ""),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const body = rows.join("\n") + "\n";
  const filename = `section_selections_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
