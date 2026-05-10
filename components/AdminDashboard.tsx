"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COURSES, SECTIONS, LAB_SUBSECTIONS } from "@/lib/courses";
import EditStudentModal from "./EditStudentModal";

type Selection = {
  id: string;
  courseCode: string;
  section: string;
  labSubsection: string | null;
};

type Student = {
  id: string;
  studentId: string;
  name: string;
  email: string;
  createdAt: string;
  selections: Selection[];
};

type Count = {
  courseCode: string;
  section: string;
  labSubsection: string | null;
  capacity: number;
  taken: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [counts, setCounts] = useState<Count[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Student | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/students", { cache: "no-store" });
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    const data = await res.json();
    setStudents(data.students);
    setCounts(data.counts);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleLogout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  }

  async function handleDelete(s: Student) {
    if (
      !window.confirm(
        `Delete submission for ${s.name} (${s.studentId})? This frees their seats and cannot be undone.`,
      )
    ) {
      return;
    }
    setBusyId(s.id);
    try {
      const res = await fetch(`/api/admin/students/${s.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAll();
      } else {
        window.alert("Delete failed.");
      }
    } finally {
      setBusyId(null);
    }
  }

  function lookupCount(
    courseCode: string,
    section: string,
    sub: string | null,
  ) {
    return counts.find(
      (c) =>
        c.courseCode === courseCode &&
        c.section === section &&
        c.labSubsection === sub,
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAll}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:border-slate-400"
          >
            Refresh
          </button>
          <a
            href="/api/admin/export"
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Download CSV
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:border-slate-400"
          >
            Sign out
          </button>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Section fill</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {COURSES.map((course) => (
            <div
              key={course.code}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 text-sm font-semibold">
                {course.code}{" "}
                <span className="text-slate-500 font-normal">
                  {course.name}
                </span>
              </div>
              {course.type === "theory" ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {SECTIONS.map((sec) => {
                    const c = lookupCount(course.code, sec, null);
                    return (
                      <FillCell
                        key={sec}
                        label={sec}
                        taken={c?.taken ?? 0}
                        capacity={c?.capacity ?? 50}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {SECTIONS.map((sec) => (
                    <div key={sec} className="space-y-1">
                      {LAB_SUBSECTIONS.map((sub) => {
                        const c = lookupCount(course.code, sec, sub);
                        return (
                          <FillCell
                            key={sub}
                            label={`${sec}${sub}`}
                            taken={c?.taken ?? 0}
                            capacity={c?.capacity ?? 25}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Submissions ({students.length})
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-slate-500">No submissions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Submitted</th>
                  <th className="px-3 py-2 text-left">Student ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  {COURSES.map((c) => (
                    <th key={c.code} className="px-3 py-2 text-left">
                      {c.code}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => {
                  const byCourse = new Map<string, Selection>();
                  for (const sel of s.selections)
                    byCourse.set(sel.courseCode, sel);
                  const busy = busyId === s.id;
                  return (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {s.studentId}
                      </td>
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2 text-slate-600">{s.email}</td>
                      {COURSES.map((c) => {
                        const sel = byCourse.get(c.code);
                        return (
                          <td key={c.code} className="px-3 py-2 font-mono">
                            {sel
                              ? `${sel.section}${sel.labSubsection ?? ""}`
                              : "—"}
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setEditing(s)}
                          className="mr-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:border-slate-400 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(s)}
                          className="rounded border border-red-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {busy ? "…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <EditStudentModal
          student={editing}
          slots={counts}
          onClose={() => setEditing(null)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}

function FillCell({
  label,
  taken,
  capacity,
}: {
  label: string;
  taken: number;
  capacity: number;
}) {
  const pct = capacity > 0 ? Math.min(100, (taken / capacity) * 100) : 0;
  const full = taken >= capacity;
  return (
    <div
      className={`rounded border px-2 py-1 text-xs ${
        full ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          {taken}/{capacity}
        </span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded bg-slate-100">
        <div
          className={`h-full ${full ? "bg-red-400" : "bg-blue-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
