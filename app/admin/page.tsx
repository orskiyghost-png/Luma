import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffRole, listReports } from "./actions";
import { AdminReports } from "./admin-reports";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const role = await getStaffRole();
  if (!role) redirect("/map");

  const { status } = await searchParams;
  const activeStatus = status ?? "open";
  const reports = await listReports(activeStatus);

  return (
    <main className="min-h-screen bg-[var(--surface-soft)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-tide">
              Панель {role === "admin" ? "администратора" : "модератора"}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">Модерация</h1>
          </div>
          <Link href="/map" className="secondary-button">На карту</Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { code: "open", label: "Открытые" },
            { code: "reviewing", label: "В работе" },
            { code: "resolved", label: "Решённые" },
            { code: "rejected", label: "Отклонённые" },
            { code: "all", label: "Все" },
          ].map((t) => (
            <Link
              key={t.code}
              href={`/admin?status=${t.code}`}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                activeStatus === t.code
                  ? "border-ink bg-ink text-white"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-soft)] hover:border-[var(--line-strong)]"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <AdminReports reports={reports} canManageRoles={role === "admin"} />
      </div>
    </main>
  );
}
