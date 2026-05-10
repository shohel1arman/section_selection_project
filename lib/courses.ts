export type CourseType = "theory" | "lab";

export type Course = {
  code: string;
  name: string;
  type: CourseType;
  note?: string;
};

export const COURSES: Course[] = [
  { code: "DS431", name: "Thesis Project", type: "theory", note: "No classes" },
  { code: "SE333", name: "Artificial Intelligence", type: "theory" },
  { code: "SE334", name: "Artificial Intelligence Lab", type: "lab" },
  { code: "DS331", name: "DS331 Theory", type: "theory" },
  { code: "DS332", name: "DS332 Lab", type: "lab" },
  { code: "DS411", name: "DS411 Theory", type: "theory" },
  { code: "DS412", name: "DS412 Lab", type: "lab" },
];

export const SECTIONS = ["A", "B", "C", "D", "E"] as const;
export const LAB_SUBSECTIONS = ["1", "2"] as const;

export const THEORY_CAPACITY = 50;
export const LAB_CAPACITY = 25;

export type Section = (typeof SECTIONS)[number];
export type LabSubsection = (typeof LAB_SUBSECTIONS)[number];

export function getCourse(code: string): Course | undefined {
  return COURSES.find((c) => c.code === code);
}

export function isLab(code: string): boolean {
  return getCourse(code)?.type === "lab";
}
