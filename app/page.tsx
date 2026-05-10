import StudentForm from "@/components/StudentForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          DIU Section Selection
        </h1>
        <p className="mt-2 text-slate-600">
          Choose your section for each course. One submission per student
          &mdash; you cannot edit after submitting.
        </p>
      </header>
      <StudentForm />
    </main>
  );
}
