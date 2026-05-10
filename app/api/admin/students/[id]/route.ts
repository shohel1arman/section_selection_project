import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ADMIN_COOKIE_NAME, verifySessionCookie } from "@/lib/adminSession";
import { COURSES, isLab } from "@/lib/courses";

export const dynamic = "force-dynamic";

class SectionFullError extends Error {
  slot: { courseCode: string; section: string; labSubsection: string | null };
  constructor(slot: SectionFullError["slot"]) {
    super("SECTION_FULL");
    this.slot = slot;
  }
}

async function requireAdmin() {
  const cookie = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionCookie(cookie);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const student = await tx.student.findUnique({
          where: { id: params.id },
          include: { selections: true },
        });
        if (!student) throw new Error("NOT_FOUND");

        for (const sel of student.selections) {
          await tx.$executeRaw(Prisma.sql`
            UPDATE "SectionCount"
            SET "taken" = GREATEST("taken" - 1, 0)
            WHERE "courseCode" = ${sel.courseCode}
              AND "section" = ${sel.section}
              AND "labSubsection" IS NOT DISTINCT FROM ${sel.labSubsection}
          `);
        }

        // Cascade deletes Selection rows.
        await tx.student.delete({ where: { id: params.id } });
      },
      { timeout: 30_000, maxWait: 5_000 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    console.error("Delete error:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

const editSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .refine((e) => e.endsWith("@diu.edu.bd"), {
        message: "Email must end with @diu.edu.bd",
      }),
    selections: z
      .array(
        z.object({
          courseCode: z.string(),
          section: z.string().regex(/^[A-G]$/),
          labSubsection: z
            .string()
            .regex(/^[12]$/)
            .nullable()
            .optional(),
        }),
      )
      .min(COURSES.length)
      .max(COURSES.length),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < data.selections.length; i++) {
      const sel = data.selections[i];
      if (seen.has(sel.courseCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selections", i, "courseCode"],
          message: `Duplicate ${sel.courseCode}`,
        });
      }
      seen.add(sel.courseCode);
      const course = COURSES.find((c) => c.code === sel.courseCode);
      if (!course) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selections", i, "courseCode"],
          message: `Unknown ${sel.courseCode}`,
        });
        continue;
      }
      const lab = isLab(sel.courseCode);
      if (lab && !sel.labSubsection) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selections", i, "labSubsection"],
          message: `Lab ${sel.courseCode} requires subsection`,
        });
      }
      if (!lab && sel.labSubsection) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selections", i, "labSubsection"],
          message: `Theory ${sel.courseCode} cannot have subsection`,
        });
      }
    }
    for (const c of COURSES) {
      if (!seen.has(c.code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selections"],
          message: `Missing ${c.code}`,
        });
      }
    }
  });

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_FAILED", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    await prisma.$transaction(
      async (tx) => {
        const student = await tx.student.findUnique({
          where: { id: params.id },
          include: { selections: true },
        });
        if (!student) throw new Error("NOT_FOUND");

        // Free old slots.
        for (const sel of student.selections) {
          await tx.$executeRaw(Prisma.sql`
            UPDATE "SectionCount"
            SET "taken" = GREATEST("taken" - 1, 0)
            WHERE "courseCode" = ${sel.courseCode}
              AND "section" = ${sel.section}
              AND "labSubsection" IS NOT DISTINCT FROM ${sel.labSubsection}
          `);
        }

        // Take new slots (conditional update).
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
        }

        // Replace selections.
        await tx.selection.deleteMany({ where: { studentRowId: student.id } });
        await tx.selection.createMany({
          data: data.selections.map((s) => ({
            studentRowId: student.id,
            courseCode: s.courseCode,
            section: s.section,
            labSubsection: s.labSubsection ?? null,
          })),
        });

        // Update name/email.
        await tx.student.update({
          where: { id: student.id },
          data: { name: data.name, email: data.email },
        });
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
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (target.includes("email")) {
          return NextResponse.json(
            { error: "DUPLICATE_EMAIL" },
            { status: 409 },
          );
        }
        return NextResponse.json({ error: "DUPLICATE" }, { status: 409 });
      }
    }
    console.error("Edit error:", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
