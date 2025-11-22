export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 bg-slate-800 rounded-lg animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-slate-800 rounded-lg animate-pulse" />
    </div>
  );
}
