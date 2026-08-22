import SiteHeader from "@/components/site-header";

export default function MessagesLoading() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="mb-8 h-10 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}