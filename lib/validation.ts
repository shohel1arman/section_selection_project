import { z } from "zod";
import { COURSES, isLab } from "./courses";

const SECTION_RE = /^[A-E]$/;
const SUB_RE = /^[12]$/;

export const submissionSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    studentId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]+$/, "Student ID must be alphanumeric")
      .min(1)
      .max(50),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email")
      .refine((e) => e.endsWith("@diu.edu.bd"), {
        message: "Email must end with @diu.edu.bd",
      }),
    selections: z
      .array(
        z.object({
          courseCode: z.string(),
          section: z.string().regex(SECTION_RE, "Section must be A-E"),
          labSubsection: z
            .string()
            .regex(SUB_RE, "Lab subsection must be 1 or 2")
            .nullable()
            .optional(),
        }),
      )
      .min(COURSES.length, "All courses must be selected")
      .max(COURSES.length, "Too many selections"),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < data.selections.length; i++) {
      const sel = data.selections[i];
      if (seen.has(sel.courseCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selections", i, "courseCode"],
          message: `Duplicate selection for ${sel.courseCode}`,
        });
      }
      seen.add(sel.courseCode);
      const course = COURSES.find((c) => c.code === sel.courseCode);
      if (!course) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selections", i, "courseCode"],
          message: `Unknown course ${sel.courseCode}`,
        });
        continue;
      }
      const lab = isLab(sel.courseCode);
      if (lab && !sel.labSubsection) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selections", i, "labSubsection"],
          message: `Lab course ${sel.courseCode} requires a subsection (1 or 2)`,
        });
      }
      if (!lab && sel.labSubsection) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selections", i, "labSubsection"],
          message: `Theory course ${sel.courseCode} must not have a subsection`,
        });
      }
    }
    for (const course of COURSES) {
      if (!seen.has(course.code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selections"],
          message: `Missing selection for ${course.code}`,
        });
      }
    }
  });

export type SubmissionInput = z.infer<typeof submissionSchema>;
