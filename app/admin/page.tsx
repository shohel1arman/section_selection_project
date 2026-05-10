import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default function AdminHome() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <AdminDashboard />
    </main>
  );
}
