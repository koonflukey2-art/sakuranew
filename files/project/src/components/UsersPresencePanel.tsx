"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Users, Wifi, WifiOff } from "lucide-react";

type Row = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  lastSeenAt: string | null;
  online: boolean;
  msAgo: number | null;
};

type ApiResp = {
  ok: boolean;
  now: string;
  onlineWindowMs: number;
  users: Row[];
  error?: string;
};

function initials(name: string | null, email: string) {
  const base = (name && name.trim()) ? name.trim() : email.split("@")[0];
  const parts = base.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? base[0] ?? "?";
  const b = parts.length > 1 ? parts[1]?.[0] : (base[1] ?? "");
  return (a + b).toUpperCase();
}

function fmtAgo(ms: number | null) {
  if (ms === null) return "ไม่เคยออนไลน์";
  if (ms < 15_000) return "เมื่อสักครู่";
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  const day = Math.floor(hr / 24);
  return `${day} วันที่แล้ว`;
}

function fmtTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role: string) {
  // ปรับตาม role จริงในระบบคุณได้
  if (role === "ADMIN") return "Admin";
  if (role === "STOCK") return "Stock";
  if (role === "EMPLOYEE") return "Employee";
  return role;
}

export default function UsersPresencePanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ ค่าเริ่มต้น: โชว์เฉพาะออนไลน์
  const [showAll, setShowAll] = useState<boolean>(false);
  const [q, setQ] = useState<string>("");
  const [nowIso, setNowIso] = useState<string | null>(null);
  const [windowMs, setWindowMs] = useState<number>(2 * 60 * 1000);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const res = await fetch("/api/presence/users", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`โหลดสถานะไม่สำเร็จ (${res.status}) ${t || ""}`.trim());
      }

      const data = (await res.json()) as ApiResp;
      if (!data.ok) throw new Error(data.error || "โหลดสถานะไม่สำเร็จ");

      setRows(Array.isArray(data.users) ? data.users : []);
      setNowIso(data.now || null);
      setWindowMs(typeof data.onlineWindowMs === "number" ? data.onlineWindowMs : 2 * 60 * 1000);
    } catch (e: any) {
      setError(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(false);
    const t = setInterval(() => load(true), 30_000); // รีเฟรชอัตโนมัติทุก 30 วิ
    return () => clearInterval(t);
  }, []);

  const onlineCount = useMemo(() => rows.filter((r) => r.online).length, [rows]);
  const offlineCount = useMemo(() => rows.filter((r) => !r.online).length, [rows]);

  const filteredSorted = useMemo(() => {
    const query = q.trim().toLowerCase();

    let arr = rows;

    // default: โชว์เฉพาะออนไลน์
    if (!showAll) arr = arr.filter((r) => r.online);

    if (query) {
      arr = arr.filter((r) => {
        const name = (r.name || "").toLowerCase();
        const email = (r.email || "").toLowerCase();
        return name.includes(query) || email.includes(query) || roleLabel(r.role).toLowerCase().includes(query);
      });
    }

    // sort: ออนไลน์ก่อน + ล่าสุดก่อน
    const sorted = [...arr].sort((a, b) => {
      const ob = Number(b.online) - Number(a.online);
      if (ob !== 0) return ob;
      const am = a.msAgo ?? 9e15;
      const bm = b.msAgo ?? 9e15;
      if (am !== bm) return am - bm;
      return (a.name || a.email).localeCompare(b.name || b.email);
    });

    return sorted;
  }, [rows, showAll, q]);

  const windowMin = Math.round(windowMs / 60_000);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/20 ring-1 ring-white/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-white/90" />
            </div>
            <div>
              <div className="text-lg md:text-xl font-semibold text-white flex items-center gap-2">
                สถานะผู้ใช้งาน
                <span className="text-xs font-medium text-white/60">
                  (ออนไลน์ภายใน {windowMin} นาที)
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  ออนไลน์ {onlineCount}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-white/10 text-white/80 ring-1 ring-white/10">
                  ทั้งหมด {rows.length}
                </span>

                {showAll && (
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-white/5 text-white/60 ring-1 ring-white/10">
                    ออฟไลน์ {offlineCount}
                  </span>
                )}

                {nowIso && (
                  <span className="text-xs text-white/40">
                    อัปเดตล่าสุด: {fmtTime(nowIso)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาชื่อ/อีเมล/บทบาท..."
                className="w-full md:w-72 rounded-xl bg-black/20 border border-white/10 focus:border-white/20 outline-none px-9 py-2 text-sm text-white placeholder:text-white/30"
              />
            </div>

            {/* Toggle show all */}
            <button
              onClick={() => setShowAll((v) => !v)}
              className={`rounded-xl px-4 py-2 text-sm font-medium border transition-all
                ${showAll
                  ? "bg-white/10 border-white/15 text-white hover:bg-white/15"
                  : "bg-emerald-500/15 border-emerald-400/20 text-emerald-200 hover:bg-emerald-500/20"
                }`}
              title={showAll ? "ซ่อนผู้ใช้ออฟไลน์" : "แสดงผู้ใช้ทั้งหมด"}
            >
              {showAll ? "แสดงเฉพาะออนไลน์" : "แสดงผู้ใช้ทั้งหมด"}
            </button>

            {/* Refresh */}
            <button
              onClick={() => load(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-all inline-flex items-center gap-2"
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 md:p-5">
        {error && (
          <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 text-red-200 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-white/10 border border-white/10 mb-3">
              {showAll ? <WifiOff className="h-6 w-6 text-white/60" /> : <Wifi className="h-6 w-6 text-emerald-200" />}
            </div>
            <div className="text-white font-semibold">
              {showAll ? "ไม่พบผู้ใช้" : "ตอนนี้ยังไม่มีผู้ใช้ออนไลน์"}
            </div>
            показ
            <div className="text-white/60 text-sm mt-1">
              {showAll ? "ลองพิมพ์ค้นหาใหม่ หรือกด Refresh" : "กด “แสดงผู้ใช้ทั้งหมด” เพื่อดูคนออฟไลน์"}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-12 bg-white/5 text-white/70 text-xs font-semibold">
              <div className="col-span-5 md:col-span-4 px-4 py-3">ผู้ใช้</div>
              <div className="hidden md:block md:col-span-3 px-4 py-3">บทบาท</div>
              <div className="col-span-3 md:col-span-2 px-4 py-3">สถานะ</div>
              <div className="col-span-4 md:col-span-3 px-4 py-3">ออนไลน์ล่าสุด</div>
            </div>

            <div className="divide-y divide-white/10">
              {filteredSorted.map((r) => {
                const online = r.online;
                const ago = fmtAgo(r.msAgo);

                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-12 items-center px-0 py-0 bg-black/10 hover:bg-white/5 transition-colors"
                  >
                    {/* user */}
                    <div className="col-span-5 md:col-span-4 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-semibold ring-1
                            ${online
                              ? "bg-emerald-500/15 ring-emerald-400/25 text-emerald-100"
                              : "bg-white/10 ring-white/10 text-white/80"
                            }`}
                          title={online ? "ออนไลน์" : "ออฟไลน์"}
                        >
                          {initials(r.name, r.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate">{r.name || "—"}</div>
                          <div className="text-white/50 text-xs truncate">{r.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* role */}
                    <div className="hidden md:block md:col-span-3 px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-white/10 text-white/80 ring-1 ring-white/10">
                        {roleLabel(r.role)}
                      </span>
                    </div>

                    {/* status */}
                    <div className="col-span-3 md:col-span-2 px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1
                          ${online
                            ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20"
                            : "bg-white/10 text-white/70 ring-white/10"
                          }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-white/30"}`} />
                        {online ? "ออนไลน์" : "ออฟไลน์"}
                      </span>
                    </div>

                    {/* last seen */}
                    <div className="col-span-4 md:col-span-3 px-4 py-3">
                      <div className="text-sm text-white">
                        {online ? "กำลังใช้งาน" : ago}
                      </div>
                      <div className="text-xs text-white/40">
                        {r.lastSeenAt ? `เวลา: ${fmtTime(r.lastSeenAt)}` : "เวลา: -"}
                      </div>

                      {/* little “activity bar” */}
                      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all
                            ${online ? "bg-emerald-400/80" : "bg-white/20"}`}
                          style={{
                            width: online
                              ? "100%"
                              : (() => {
                                  const ms = r.msAgo ?? 9e15;
                                  // ยิ่งนาน ยิ่งสั้น (สูงสุด 48ชม.)
                                  const cap = 48 * 60 * 60 * 1000;
                                  const pct = Math.max(5, 100 - Math.min(100, Math.round((ms / cap) * 100)));
                                  return `${pct}%`;
                                })(),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* footer hint */}
            <div className="px-4 py-3 bg-white/5 text-xs text-white/50 flex items-center justify-between">
              <div>
                {showAll
                  ? "กำลังแสดงผู้ใช้ทั้งหมด (ออนไลน์ + ออฟไลน์)"
                  : "กำลังแสดงเฉพาะผู้ใช้ออนไลน์"}
              </div>
              <div className="hidden md:block">
                เคล็ดลับ: พิมพ์ค้นหาเพื่อกรองชื่อ/อีเมล/บทบาท
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
