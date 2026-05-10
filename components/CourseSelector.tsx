"use client";

import { Course, SECTIONS, LAB_SUBSECTIONS } from "@/lib/courses";
import SeatBadge from "./SeatBadge";

export type Slot = {
  courseCode: string;
  section: string;
  labSubsection: string | null;
  capacity: number;
  taken: number;
};

type Props = {
  course: Course;
  slots: Slot[];
  selected: { section: string; labSubsection: string | null } | null;
  highlightedFullKey?: string | null;
  onSelect: (section: string, labSubsection: string | null) => void;
};

function slotKey(courseCode: string, section: string, sub: string | null) {
  return `${courseCode}|${section}|${sub ?? ""}`;
}

export default function CourseSelector({
  course,
  slots,
  selected,
  highlightedFullKey,
  onSelect,
}: Props) {
  const slotMap = new Map<string, Slot>();
  for (const s of slots) {
    if (s.courseCode !== course.code) continue;
    slotMap.set(slotKey(course.code, s.section, s.labSubsection), s);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <div className="font-semibold">
            {course.code}{" "}
            <span className="text-slate-500 font-normal">{course.name}</span>
          </div>
          {course.note && (
            <div className="text-xs text-slate-500">{course.note}</div>
          )}
        </div>
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {course.type}
        </div>
      </div>

      {course.type === "theory" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {SECTIONS.map((sec) => {
            const slot = slotMap.get(slotKey(course.code, sec, null));
            const taken = slot?.taken ?? 0;
            const cap = slot?.capacity ?? 50;
            const full = taken >= cap;
            const isSelected =
              selected?.section === sec && selected?.labSubsection === null;
            const k = slotKey(course.code, sec, null);
            const flagged = highlightedFullKey === k;
            return (
              <button
                key={sec}
                type="button"
                disabled={full}
                onClick={() => onSelect(sec, null)}
                className={[
                  "flex items-center justify-between rounded border px-3 py-2 text-sm transition",
                  full
                    ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                    : isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-300 bg-white hover:border-slate-400",
                  flagged ? "ring-2 ring-red-400" : "",
                ].join(" ")}
              >
                <span className="font-medium">{sec}</span>
                <SeatBadge taken={taken} capacity={cap} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {SECTIONS.map((sec) => (
            <div key={sec} className="space-y-1">
              <div className="text-xs font-semibold text-slate-500">
                Section {sec}
              </div>
              {LAB_SUBSECTIONS.map((sub) => {
                const slot = slotMap.get(slotKey(course.code, sec, sub));
                const taken = slot?.taken ?? 0;
                const cap = slot?.capacity ?? 25;
                const full = taken >= cap;
                const isSelected =
                  selected?.section === sec &&
                  selected?.labSubsection === sub;
                const k = slotKey(course.code, sec, sub);
                const flagged = highlightedFullKey === k;
                return (
                  <button
                    key={sub}
                    type="button"
                    disabled={full}
                    onClick={() => onSelect(sec, sub)}
                    className={[
                      "flex w-full items-center justify-between rounded border px-2 py-1.5 text-sm transition",
                      full
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                        : isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-300 bg-white hover:border-slate-400",
                      flagged ? "ring-2 ring-red-400" : "",
                    ].join(" ")}
                  >
                    <span className="font-medium">
                      {sec}
                      {sub}
                    </span>
                    <SeatBadge taken={taken} capacity={cap} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
