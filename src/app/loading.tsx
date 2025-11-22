export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
        <p className="text-slate-400">กำลังโหลด...</p>
      </div>
    </div>
  );
}
