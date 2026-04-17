'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DnsQuery {
  id: string;
  timestamp: number;
  clientIp: string;
  domain: string;
  type: string;
  category: string;
}

interface Stats {
  topDomains: { domain: string; count: number }[];
  topClients: { ip: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  total: number;
}

interface ApiResponse {
  isRunning: boolean;
  isDemo: boolean;
  warning: string | null;
  queries: DnsQuery[];
  stats: Stats;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Streaming': '#ef4444',
  'Media Sosial': '#8b5cf6',
  'Pencarian': '#3b82f6',
  'E-Commerce': '#f97316',
  'Komunikasi': '#10b981',
  'Developer': '#14b8a6',
  'Iklan / Analytics': '#6b7280',
  'CDN / Update': '#64748b',
  'Lainnya': '#94a3b8',
};

const CATEGORY_BG: Record<string, string> = {
  'Streaming': 'bg-red-500/10 text-red-400',
  'Media Sosial': 'bg-violet-500/10 text-violet-400',
  'Pencarian': 'bg-blue-500/10 text-blue-400',
  'E-Commerce': 'bg-orange-500/10 text-orange-400',
  'Komunikasi': 'bg-emerald-500/10 text-emerald-400',
  'Developer': 'bg-teal-500/10 text-teal-400',
  'Iklan / Analytics': 'bg-gray-500/10 text-gray-400',
  'CDN / Update': 'bg-slate-500/10 text-slate-400',
  'Lainnya': 'bg-zinc-500/10 text-zinc-400',
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'baru saja';
  if (diff < 60) return `${diff}d lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  return `${Math.floor(diff / 3600)}j lalu`;
}

export default function DnsSniffPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [queries, setQueries] = useState<DnsQuery[]>([]);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [liveCount, setLiveCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [, forceRender] = useState(0); // untuk timestamp update

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dns-sniff');
      const json: ApiResponse = await res.json();
      setData(json);
      setQueries(json.queries);
    } catch (e) {
      console.error('Gagal fetch DNS data', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Setiap 5 detik refresh stats
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // Re-render timestamps setiap 10 detik
  useEffect(() => {
    const iv = setInterval(() => forceRender(n => n + 1), 10000);
    return () => clearInterval(iv);
  }, []);

  // SSE stream untuk live queries
  useEffect(() => {
    const es = new EventSource('/api/dns-sniff/stream');
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      if (pausedRef.current) return;
      try {
        const query: DnsQuery = JSON.parse(e.data);
        setLiveCount(c => c + 1);
        setQueries(prev => {
          const next = [query, ...prev];
          return next.slice(0, 200);
        });
      } catch { /* ignore non-data events */ }
    };

    return () => {
      es.close();
    };
  }, []);

  const handleClear = async () => {
    await fetch('/api/dns-sniff', { method: 'DELETE' });
    setQueries([]);
    setLiveCount(0);
    fetchData();
  };

  const filteredQueries = queries.filter(q => {
    const matchText = filter === '' || q.domain.includes(filter) || q.clientIp.includes(filter);
    const matchCat = categoryFilter === '' || q.category === categoryFilter;
    return matchText && matchCat;
  });

  const stats = data?.stats;
  const categories = Object.keys(CATEGORY_COLORS);
  const maxDomainCount = stats?.topDomains[0]?.count ?? 1;

  return (
    <div className="min-h-screen bg-base-100 lg:pl-72 pt-20">
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ── HEADER ─────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Passive DNS Monitor</h1>
                <p className="text-xs text-base-content/50 font-medium">Memantau DNS query dari perangkat di jaringan secara real-time</p>
              </div>
            </div>
          </div>

          {/* Status & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {data?.isDemo ? (
              <span className="badge badge-warning gap-1 font-bold">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                Mode Demo
              </span>
            ) : data?.isRunning ? (
              <span className="badge badge-success gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-success-content animate-ping inline-block" />
                Live
              </span>
            ) : (
              <span className="badge badge-error font-bold">Tidak Aktif</span>
            )}
            <span className="badge badge-ghost font-mono font-bold">{stats?.total ?? 0} total</span>
            <span className="badge badge-ghost font-mono font-bold text-emerald-400">+{liveCount} live</span>

            <button
              onClick={() => setPaused(p => !p)}
              className={`btn btn-sm rounded-xl font-bold ${paused ? 'btn-success' : 'btn-ghost border border-base-200'}`}
            >
              {paused ? (
                <><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>Lanjutkan</>
              ) : (
                <><svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>Jeda</>
              )}
            </button>

            <button onClick={handleClear} className="btn btn-sm btn-ghost rounded-xl border border-base-200 text-error font-bold">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6m5 0V4h4v2" /></svg>
              Hapus
            </button>
          </div>
        </div>

        {/* ── WARNING BANNER ─────────────────────── */}
        {data?.warning && (
          <div className={`rounded-2xl p-4 border text-sm font-medium flex gap-3 items-start
            ${data.isDemo ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="font-bold mb-1">{data.isDemo ? 'Mode Demo Aktif' : 'Peringatan'}</p>
              <p className="opacity-80">{data.warning}</p>
              {data.isDemo && (
                <div className="mt-2 opacity-70 text-xs">
                  <strong>Cara mengaktifkan data nyata:</strong><br />
                  1. Jalankan Next.js sebagai Administrator<br />
                  2. Ubah DNS server perangkat klien ke IP server ini<br />
                  3. Atau ubah DHCP DNS di router ke IP server ini
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STATS CARDS ─────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Query', value: stats?.total ?? 0, color: 'text-violet-400', bg: 'from-violet-500/10 to-purple-500/5' },
            { label: 'Domain Unik', value: stats?.topDomains.length ?? 0, color: 'text-blue-400', bg: 'from-blue-500/10 to-sky-500/5' },
            { label: 'Klien Aktif', value: stats?.topClients.length ?? 0, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-teal-500/5' },
            { label: 'Kategori', value: stats?.categoryBreakdown.length ?? 0, color: 'text-orange-400', bg: 'from-orange-500/10 to-amber-500/5' },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.bg} border border-base-200 rounded-2xl p-5`}>
              <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* ── CHARTS ROW ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top Domains */}
          <div className="bg-base-100 border border-base-200 rounded-2xl p-5">
            <h2 className="text-sm font-black uppercase tracking-widest text-base-content/50 mb-4">🔥 Domain Paling Sering</h2>
            <div className="space-y-2.5">
              {stats?.topDomains.slice(0, 7).map((d, i) => (
                <div key={d.domain}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="truncate pr-2 text-base-content/80">{d.domain}</span>
                    <span className="text-base-content/50 shrink-0">{d.count}x</span>
                  </div>
                  <div className="h-1.5 bg-base-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(d.count / maxDomainCount) * 100}%`,
                        background: `hsl(${270 - i * 20}, 80%, 65%)`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {!stats?.topDomains.length && (
                <p className="text-center text-xs text-base-content/30 py-6">Belum ada data...</p>
              )}
            </div>
          </div>

          {/* Category Pie-like */}
          <div className="bg-base-100 border border-base-200 rounded-2xl p-5">
            <h2 className="text-sm font-black uppercase tracking-widest text-base-content/50 mb-4">📊 Kategori Traffic</h2>
            <div className="space-y-2">
              {stats?.categoryBreakdown.map(c => {
                const pct = stats.total > 0 ? ((c.count / stats.total) * 100).toFixed(1) : '0';
                const color = CATEGORY_COLORS[c.category] ?? '#94a3b8';
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold mb-0.5">
                        <span className="text-base-content/70">{c.category}</span>
                        <span className="text-base-content/40">{c.count}x · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-base-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {!stats?.categoryBreakdown.length && (
                <p className="text-center text-xs text-base-content/30 py-6">Belum ada data...</p>
              )}
            </div>
          </div>
        </div>

        {/* ── LIVE QUERY TABLE ───────────────────── */}
        <div className="bg-base-100 border border-base-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-base-200 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h2 className="text-sm font-black uppercase tracking-widest text-base-content/50">📡 Live DNS Queries</h2>
              <p className="text-xs text-base-content/30 mt-0.5">Query terbaru tampil di atas</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter domain / IP..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="pl-8 pr-3 py-2 text-xs rounded-xl border border-base-200 bg-base-200/50 focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-44"
                />
              </div>
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs rounded-xl border border-base-200 bg-base-200/50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              >
                <option value="">Semua Kategori</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-base-200">
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-base-content/30">Waktu</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-base-content/30">Klien (IP)</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-base-content/30">Domain</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-base-content/30">Tipe</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-base-content/30">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueries.slice(0, 80).map((q, idx) => (
                  <tr
                    key={q.id}
                    className={`border-b border-base-200/50 transition-colors hover:bg-base-200/30 ${idx === 0 && !paused ? 'animate-pulse-once' : ''}`}
                  >
                    <td className="px-5 py-3 text-xs text-base-content/40 font-mono whitespace-nowrap">
                      {timeAgo(q.timestamp)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-base-content/70 whitespace-nowrap">
                      {q.clientIp}
                    </td>
                    <td className="px-5 py-3 font-medium text-sm max-w-[200px]">
                      <span className="truncate block" title={q.domain}>{q.domain}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="badge badge-ghost badge-sm font-mono font-bold">{q.type}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${CATEGORY_BG[q.category] ?? 'bg-zinc-500/10 text-zinc-400'}`}>
                        {q.category}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredQueries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-base-content/30">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <p className="text-sm font-bold">Belum ada DNS query yang tertangkap</p>
                        <p className="text-xs">Pastikan DNS klien diarahkan ke IP server ini, atau tunggu sebentar...</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredQueries.length > 80 && (
            <div className="px-5 py-3 border-t border-base-200 text-xs text-base-content/40 font-medium text-center">
              Menampilkan 80 dari {filteredQueries.length} query (gunakan filter untuk mempersempit)
            </div>
          )}
        </div>

        {/* ── TOP CLIENTS ─────────────────────────── */}
        {stats && stats.topClients.length > 0 && (
          <div className="bg-base-100 border border-base-200 rounded-2xl p-5">
            <h2 className="text-sm font-black uppercase tracking-widest text-base-content/50 mb-4">💻 Perangkat Paling Aktif</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {stats.topClients.map((c, i) => (
                <div key={c.ip} className="bg-base-200/50 border border-base-200 rounded-xl p-3 text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-black
                    ${i === 0 ? 'bg-violet-500 text-white' : i === 1 ? 'bg-blue-500 text-white' : i === 2 ? 'bg-emerald-500 text-white' : 'bg-base-300 text-base-content/50'}`}>
                    {i + 1}
                  </div>
                  <p className="font-mono text-xs font-bold text-base-content/80 truncate">{c.ip}</p>
                  <p className="text-[11px] text-base-content/40 mt-0.5">{c.count} query</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HOW IT WORKS ────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/10 rounded-2xl p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-violet-400/70 mb-3">ℹ️ Cara Kerja Passive DNS Sniffing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-base-content/60">
            <div>
              <p className="font-black text-base-content/70 mb-1">1️⃣ Server sebagai DNS Forwarder</p>
              <p>Server Next.js ini mendengarkan pada port UDP 53. Setiap perangkat yang DNS-nya diarahkan ke IP server ini akan termonitor.</p>
            </div>
            <div>
              <p className="font-black text-base-content/70 mb-1">2️⃣ Parsing DNS Query</p>
              <p>Setiap paket DNS yang masuk diurai menggunakan library dns-packet untuk mengekstrak nama domain dan tipe query.</p>
            </div>
            <div>
              <p className="font-black text-base-content/70 mb-1">3️⃣ Streaming Real-Time</p>
              <p>Data baru dikirim ke browser via SSE (Server-Sent Events) sehingga tabel terupdate secara live tanpa perlu refresh.</p>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse-once {
          0% { background-color: rgba(139, 92, 246, 0.15); }
          100% { background-color: transparent; }
        }
        .animate-pulse-once {
          animation: pulse-once 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
