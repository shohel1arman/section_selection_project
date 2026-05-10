"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COURSES, getCourse } from "@/lib/courses";

type LastSubmission = {
  name: string;
  studentId: string;
  email: string;
  selections: {
    courseCode: string;
    section: string;
    labSubsection: string | null;
  }[];
  at: string;
};

export default function Success() {
  const [data, setData] = useState<LastSubmission | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("lastSubmission");
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch {}
    }
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <h1 className="text-2xl font-bold text-emerald-900">Submission received</h1>
        <p className="mt-1 text-emerald-800">
          Your section selections have been saved. Edits are not allowed.
        </p>
      </div>

      {data ? (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Summary</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <Row label="Name" value={data.name} />
            <Row label="Student ID" value={data.studentId} />
            <Row label="Email" value={data.email} />
            <Row label="Submitted" value={new Date(data.at).toLocaleString()} />
          </dl>

          <h3 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Selections
          </h3>
          <ul className="divide-y divide-slate-200 rounded border border-slate-200">
            {COURSES.map((c) => {
              const sel = data.selections.find((s) => s.courseCode === c.code);
              const course = getCourse(c.code);
              return (
                <li key={c.code} className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-medium">
                      {c.code}{" "}
                      <span className="text-slate-500 font-normal">
                        {course?.name}
                      </span>
                    </div>
                    {course?.note && (
                      <div className="text-xs text-slate-500">{course.note}</div>
                    )}
                  </div>
                  <div className="font-mono text-sm">
                    {sel
                      ? `${sel.section}${sel.labSubsection ?? ""}`
                      : "—"}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="mt-6 text-sm text-slate-600">
          (No submission details available in this browser session.)
        </p>
      )}

      <div className="mt-6">
        <Link
          href="/"
          className="text-sm text-blue-600 underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
