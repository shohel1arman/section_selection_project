import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { submissionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

class SectionFullError extends Error {
  slot: { courseCode: string; section: string; labSubsection: string | null };
  constructor(slot: SectionFullError["slot"]) {
    super("SECTION_FULL");
    this.slot = slot;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_FAILED",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(
      async (tx) => {
        const student = await tx.student.create({
          data: {
            studentId: data.studentId,
            name: data.name,
            email: data.email,
          },
        });

        const selectionRows: {
          studentRowId: string;
          courseCode: string;
          section: string;
          labSubsection: string | null;
        }[] = [];

        for (const sel of data.selections) {
          const sub = sel.labSubsection ?? null;
          const result = await tx.$executeRaw(Prisma.sql`
            UPDATE "SectionCount"
            SET "taken" = "taken" + 1
            WHERE "courseCode" = ${sel.courseCode}
              AND "section" = ${sel.section}
              AND "labSubsection" IS NOT DISTINCT FROM ${sub}
              AND "taken" < "capacity"
          `);
          if (result !== 1) {
            throw new SectionFullError({
              courseCode: sel.courseCode,
              section: sel.section,
              labSubsection: sub,
            });
          }
          selectionRows.push({
            studentRowId: student.id,
            courseCode: sel.courseCode,
            section: sel.section,
            labSubsection: sub,
          });
        }

        await tx.selection.createMany({ data: selectionRows });
      },
      { timeout: 30_000, maxWait: 5_000 },
    );
  } catch (err) {
    if (err instanceof SectionFullError) {
      return NextResponse.json(
        { error: "SECTION_FULL", slot: err.slot },
        { status: 409 },
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (target.includes("studentId")) {
          return NextResponse.json(
            { error: "DUPLICATE_STUDENT_ID" },
            { status: 409 },
          );
        }
        if (target.includes("email")) {
          return NextResponse.json(
            { error: "DUPLICATE_EMAIL" },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: "DUPLICATE" }, { status: 409 });
      }
    }
    console.error("Submit error:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
