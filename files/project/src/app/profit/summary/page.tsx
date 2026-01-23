'use client';

import { useEffect, useState } from 'react';

type ProfitSummary = {
  totals: {
    grossRevenue: number;
    discountTotal: number | null;
    netRevenue: number | null;
    vatAmount: number | null;
    revenueAfterVat: number | null;
    productCosts: number;
    grossProfit: number;
    grossProfitAfterVat: number | null;
    orderCount: number;
  };
  products: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    discount: number | null;
    netRevenue: number | null;
    cost: number;
    profit: number;
    margin: number | null;
  }>;
};

export default function ProfitSummaryPage() {
  const [data, setData] = useState<ProfitSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profit/summary', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ProfitSummary;
        setData(json);
      } catch (e: any) {
        setErr(e?.message ?? 'Fetch failed');
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Profit Summary</h1>

      {err && (
        <div style={{ background: '#fee', border: '1px solid #f99', padding: 12, borderRadius: 8 }}>
          Error: {err}
        </div>
      )}

      {!data ? (
        <div>Loading...</div>
      ) : (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 16 }}>Totals</h2>
          <pre style={{ background: '#fff', padding: 12, borderRadius: 8, overflow: 'auto' }}>
            {JSON.stringify(data.totals, null, 2)}
          </pre>

          <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 16 }}>Products</h2>
          <pre style={{ background: '#fff', padding: 12, borderRadius: 8, overflow: 'auto' }}>
            {JSON.stringify(data.products, null, 2)}
          </pre>
        </>
      )}
    </main>
  );
}
