export default function MapLoading() {
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner" />
        <p className="text-sm font-bold text-slate-500">Загружаем карту…</p>
      </div>
    </main>
  );
}