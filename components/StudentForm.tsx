"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COURSES, isLab } from "@/lib/courses";
import CourseSelector, { Slot } from "./CourseSelector";

type Selection = { section: string; labSubsection: string | null };

const POLL_MS = 10_000;

function slotKey(courseCode: string, section: string, sub: string | null) {
  return `${courseCode}|${section}|${sub ?? ""}`;
}

export default function StudentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedFullKey, setHighlightedFullKey] = useState<string | null>(
    null,
  );

  const fetchAvailability = useCallback(async () => {
    try {
      const res = await fetch("/api/availability", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load availability");
      const data = (await res.json()) as { slots: Slot[] };
      setSlots(data.slots);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
    const id = setInterval(fetchAvailability, POLL_MS);
    const onFocus = () => fetchAvailability();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAvailability]);

  const handleSelect = useCallback(
    (courseCode: string, section: string, sub: string | null) => {
      setSelections((prev) => ({
        ...prev,
        [courseCode]: { section, labSubsection: sub },
      }));
      setHighlightedFullKey(null);
      setError(null);
    },
    [],
  );

  const allChosen = useMemo(
    () => COURSES.every((c) => selections[c.code]),
    [selections],
  );

  const emailValid = useMemo(
    () => /^[^\s@]+@diu\.edu\.bd$/i.test(email.trim()),
    [email],
  );
  const nameValid = name.trim().length > 0;
  const idValid = /^[A-Za-z0-9-]+$/.test(studentId.trim());

  const canSubmit =
    !submitting && nameValid && idValid && emailValid && allChosen;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      studentId: studentId.trim(),
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
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 201) {
        sessionStorage.setItem(
          "lastSubmission",
          JSON.stringify({ ...payload, at: new Date().toISOString() }),
        );
        router.push("/success");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data?.error === "SECTION_FULL") {
        const slot = data.slot as Slot;
        setHighlightedFullKey(
          slotKey(slot.courseCode, slot.section, slot.labSubsection),
        );
        setError(
          `Section ${slot.section}${slot.labSubsection ?? ""} for ${slot.courseCode} just filled up. Please pick another.`,
        );
        await fetchAvailability();
      } else if (res.status === 409 && data?.error === "DUPLICATE_STUDENT_ID") {
        setError("This student ID has already submitted. Edits are not allowed.");
      } else if (res.status === 409 && data?.error === "DUPLICATE_EMAIL") {
        setError("This email has already submitted. Edits are not allowed.");
      } else if (res.status === 400) {
        setError("Form is invalid. Please check your entries.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Your details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Full name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Md Shohel Arman"
            />
          </Field>
          <Field label="Student ID" required>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              maxLength={50}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="221-15-12345"
            />
            {studentId && !idValid && (
              <p className="mt-1 text-xs text-red-600">
                Use letters, digits, and hyphens only.
              </p>
            )}
          </Field>
          <Field label="DIU email" required>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="yourname@diu.edu.bd"
            />
            {email && !emailValid && (
              <p className="mt-1 text-xs text-red-600">
                Email must end with @diu.edu.bd
              </p>
            )}
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pick a section per course</h2>
          {loading && (
            <span className="text-xs text-slate-500">Loading availability…</span>
          )}
        </div>
        {COURSES.map((course) => (
          <CourseSelector
            key={course.code}
            course={course}
            slots={slots}
            selected={selections[course.code] ?? null}
            highlightedFullKey={highlightedFullKey}
            onSelect={(sec, sub) => handleSelect(course.code, sec, sub)}
          />
        ))}
      </section>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <p className="text-xs text-slate-500">
          {allChosen
            ? "All 7 courses selected."
            : `${Object.keys(selections).length}/${COURSES.length} courses selected.`}
        </p>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}
