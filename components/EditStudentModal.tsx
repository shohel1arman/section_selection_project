"use client";

import { useEffect, useState } from "react";
import { COURSES, isLab } from "@/lib/courses";
import CourseSelector, { Slot } from "./CourseSelector";

type Selection = {
  courseCode: string;
  section: string;
  labSubsection: string | null;
};

type Student = {
  id: string;
  studentId: string;
  name: string;
  email: string;
  selections: Selection[];
};

type Props = {
  student: Student;
  slots: Slot[];
  onClose: () => void;
  onSaved: () => void;
};

function slotKey(courseCode: string, section: string, sub: string | null) {
  return `${courseCode}|${section}|${sub ?? ""}`;
}

export default function EditStudentModal({
  student,
  slots,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState(student.name);
  const [email, setEmail] = useState(student.email);
  const [selections, setSelections] = useState<
    Record<string, { section: string; labSubsection: string | null }>
  >(() => {
    const init: Record<
      string,
      { section: string; labSubsection: string | null }
    > = {};
    for (const sel of student.selections) {
      init[sel.courseCode] = {
        section: sel.section,
        labSubsection: sel.labSubsection,
      };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedFullKey, setHighlightedFullKey] = useState<string | null>(
    null,
  );

  // Compute "effective" availability: subtract this student's current picks
  // from the SectionCount counts, so their own seats appear free for them.
  const effectiveSlots: Slot[] = slots.map((s) => {
    const taken = student.selections.some(
      (sel) =>
        sel.courseCode === s.courseCode &&
        sel.section === s.section &&
        sel.labSubsection === s.labSubsection,
    )
      ? Math.max(0, s.taken - 1)
      : s.taken;
    return { ...s, taken };
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const emailValid = /^[^\s@]+@diu\.edu\.bd$/i.test(email.trim());
  const nameValid = name.trim().length > 0;
  const allChosen = COURSES.every((c) => selections[c.code]);
  const canSave = !saving && emailValid && nameValid && allChosen;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setHighlightedFullKey(null);

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      selections: COURSES.map((c) => {
        const sel = selections[c.code];
        return {
          courseCode: c.code,
          section: sel.section,
          labSubsection: isLab(c.code) ? sel.labSubsection : null,
        };
      }),
    };

    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSaved();
        onClose();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data?.error === "SECTION_FULL") {
        const slot = data.slot;
        setHighlightedFullKey(
          slotKey(slot.courseCode, slot.section, slot.labSubsection),
        );
        setError(
          `Section ${slot.section}${slot.labSubsection ?? ""} for ${slot.courseCode} is full.`,
        );
      } else if (res.status === 409 && data?.error === "DUPLICATE_EMAIL") {
        setError("That email is already used by another student.");
      } else if (res.status === 400) {
        setError("Form is invalid. Please check your entries.");
      } else {
        setError("Save failed. Please try again.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Edit submission</h2>
            <p className="text-xs text-slate-500">
              Student ID:{" "}
              <span className="font-mono">{student.studentId}</span> &middot;
              Capacity is re-checked on save.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">
                Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {email && !emailValid && (
                <p className="mt-1 text-xs text-red-600">
                  Email must end with @diu.edu.bd
                </p>
              )}
            </label>
          </div>

          <div className="space-y-3">
            {COURSES.map((course) => (
              <CourseSelector
                key={course.code}
                course={course}
                slots={effectiveSlots}
                selected={selections[course.code] ?? null}
                highlightedFullKey={highlightedFullKey}
                onSelect={(sec, sub) => {
                  setSelections((prev) => ({
                    ...prev,
                    [course.code]: { section: sec, labSubsection: sub },
                  }));
                  setError(null);
                  setHighlightedFullKey(null);
                }}
              />
            ))}
          </div>

          {error && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:border-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
