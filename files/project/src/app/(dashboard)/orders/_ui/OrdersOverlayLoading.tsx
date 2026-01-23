export default function OrdersOverlayLoading({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/10 backdrop-blur-[1px]">
      <div className="rounded-xl border bg-white px-5 py-4 shadow">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <div className="text-sm">Loading orders…</div>
        </div>
      </div>
    </div>
  );
}
