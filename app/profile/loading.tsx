import SiteHeader from "@/components/site-header";

export default function ProfileLoading() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="h-80 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </div>
    </main>
  );
}