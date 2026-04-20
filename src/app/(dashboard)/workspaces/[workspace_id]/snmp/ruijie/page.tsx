'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import type { TrapEvent } from '@/src/lib/snmp/trap-store';

// ── Walk Modal ────────────────────────────────────────────────────────────────
interface WalkResult { oid: string; label: string; type: string; value: string | number; }
interface WalkResponse { count: number; durationMs: number; groups: Record<string, WalkResult[]>; }

function WalkModal({ host, community, onClose }: { host: string; community: string; onClose: () => void }) {
  const [status, setStatus]   = useState<'loading' | 'done' | 'error'>('loading');
  const [result, setResult]   = useState<WalkResponse | null>(null);
  const [errMsg, setErrMsg]   = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [search, setSearch]   = useState('');

  const runWalk = async () => {
    setStatus('loading'); setResult(null);
    try {
      const p = new URLSearchParams({ host, community, device: 'ruijie', limit: '1000' });
      const res = await fetch(`/api/snmp/walk?${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Walk gagal');
      setResult(json);
      setActiveGroup(Object.keys(json.groups)[0] ?? null);
      setStatus('done');
    } catch (e: any) { setErrMsg(e.message); setStatus('error'); }
  };

  useEffect(() => {
    runWalk();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOids = result && activeGroup
    ? (result.groups[activeGroup] ?? []).filter(r =>
        search === '' || r.oid.includes(search) || String(r.value).toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-4xl bg-base-100 rounded-3xl border border-base-300 shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
          <div className="flex items-center justify-between p-6 border-b border-base-300 shrink-0">
            <div>
              <h2 className="text-lg font-black tracking-tight">SNMP Walk — OID Discovery</h2>
              <p className="text-xs opacity-50 mt-0.5">Host: <code className="font-mono bg-base-200 px-1.5 py-0.5 rounded">{host}</code></p>
            </div>
            <div className="flex items-center gap-2">
              {status !== 'loading' && (
                <button onClick={runWalk} className="btn btn-secondary btn-sm rounded-xl font-bold gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  Ulangi Walk
                </button>
              )}
              {status === 'loading' && <span className="loading loading-spinner loading-sm text-secondary" />}
              <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {status === 'loading' && (
              <div className="flex flex-col items-center justify-center flex-1 gap-4 opacity-70 p-10">
                <span className="loading loading-spinner loading-lg text-secondary"></span>
                <p className="text-sm font-bold text-center">Sedang melakukan SNMP Walk...<br/><span className="text-xs opacity-60">Proses bisa memakan 10–60 detik</span></p>
              </div>
            )}
            {status === 'error' && <div className="alert alert-error m-6 rounded-2xl"><span>{errMsg}</span></div>}
            {status === 'done' && result && (
              <div className="flex flex-1 overflow-hidden">
                <div className="w-52 shrink-0 border-r border-base-300 overflow-y-auto p-3 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40 px-2 pb-1">{result.count} OID · {result.durationMs}ms</p>
                  {Object.keys(result.groups).map(g => (
                    <button key={g} onClick={() => setActiveGroup(g)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        activeGroup === g ? 'bg-secondary/15 text-secondary' : 'hover:bg-base-200 opacity-60'}`}>
                      {g}<span className="ml-1 opacity-40 text-[10px]">({result.groups[g].length})</span>
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col">
                  <div className="p-3 border-b border-base-300 shrink-0">
                    <input type="text" placeholder="Filter OID atau nilai..." value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="input input-sm input-bordered rounded-xl w-full text-xs" />
                  </div>
                  <div className="overflow-y-auto">
                    <table className="table table-xs w-full">
                      <thead className="sticky top-0 bg-base-100 z-10">
                        <tr className="text-[9px] uppercase tracking-widest opacity-40">
                          <th className="w-64">OID</th><th className="w-24">Type</th><th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOids.map(r => (
                          <tr key={r.oid} className="hover:bg-base-200/50">
                            <td className="font-mono text-[10px] text-secondary/80 align-top">{r.oid}</td>
                            <td><span className="badge badge-ghost badge-xs font-mono">{r.type}</span></td>
                            <td className="text-xs font-medium break-all max-w-xs">{String(r.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Trap Panel ────────────────────────────────────────────────────────────────
const SEVERITY_STYLE: Record<string, string> = {
  critical: 'alert-error', warning: 'alert-warning', info: 'alert-info',
};

function TrapPanel({ sourceIp }: { sourceIp?: string }) {
  const [traps, setTraps] = useState<TrapEvent[]>([]);
  const [stats, setStats] = useState({ total: 0, unacknowledged: 0, critical: 0, warning: 0 });

  const fetchTraps = useCallback(async () => {
    const p = new URLSearchParams({ limit: '20' });
    if (sourceIp) p.set('source', sourceIp);
    const res = await fetch(`/api/snmp/traps?${p}`).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    setTraps(data.traps ?? []);
    setStats(data.stats ?? { total: 0, unacknowledged: 0, critical: 0, warning: 0 });
  }, [sourceIp]);

  useEffect(() => {
    fetchTraps();
    const id = setInterval(fetchTraps, 10_000);
    return () => clearInterval(id);
  }, [fetchTraps]);

  const ack = async (id: string) => {
    await fetch('/api/snmp/traps', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchTraps();
  };
  const clearAll = async () => {
    await fetch('/api/snmp/traps', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clear: true }) });
    fetchTraps();
  };

  return (
    <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Peringatan Otomatis</p>
          <h2 className="text-base font-black tracking-tight flex items-center gap-2">
            SNMP Trap Alerts
            {stats.unacknowledged > 0 && <span className="badge badge-error badge-sm font-black">{stats.unacknowledged}</span>}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-black opacity-40">
            {stats.critical > 0 && <span className="text-error">🔴 {stats.critical}</span>}
            {stats.warning > 0 && <span className="text-warning">🟡 {stats.warning}</span>}
          </div>
          <button onClick={fetchTraps} className="btn btn-ghost btn-xs btn-circle">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
          {stats.total > 0 && <button onClick={clearAll} className="btn btn-ghost btn-xs rounded-xl font-bold opacity-40 hover:opacity-100">Hapus Semua</button>}
        </div>
      </div>
      {traps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-30">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p className="text-xs font-bold">Tidak ada trap — perangkat berjalan normal</p>
        </div>
      ) : (
        <div className="space-y-2">
          {traps.map(trap => (
            <div key={trap.id} className={`alert ${SEVERITY_STYLE[trap.severity] ?? 'alert-info'} rounded-2xl py-3 px-4 ${trap.acknowledged ? 'opacity-40' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge badge-xs font-black uppercase ${
                    trap.severity === 'critical' ? 'badge-error' : trap.severity === 'warning' ? 'badge-warning' : 'badge-info'
                  }`}>{trap.severity}</span>
                  <span className="text-xs font-black">{trap.trapType}</span>
                  <span className="text-[10px] opacity-60 font-mono">{trap.sourceIp}</span>
                </div>
                <p className="text-[10px] opacity-60 mt-0.5">{new Date(trap.receivedAt).toLocaleString('id-ID')}</p>
                {trap.varbinds.length > 0 && (
                  <details className="mt-1">
                    <summary className="text-[10px] opacity-50 cursor-pointer font-bold">Varbinds ({trap.varbinds.length})</summary>
                    <div className="mt-1 space-y-0.5">
                      {trap.varbinds.map((vb, i) => (
                        <p key={i} className="text-[10px] font-mono opacity-70">
                          <span className="text-secondary/70">{vb.oid}</span> = {String(vb.value)}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              {!trap.acknowledged && (
                <button onClick={() => ack(trap.id)} className="btn btn-ghost btn-xs rounded-lg shrink-0 font-bold">✓ Ack</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DataPoint {
  time: string;
  cpu: number;
  memory: number;
  rx: number;
  tx: number;
}

const CHART_COMMON = {
  margin: { top: 5, right: 10, left: -10, bottom: 0 },
};
const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: '12px',
    border: '1px solid oklch(var(--b3))',
    background: 'oklch(var(--b1))',
    fontSize: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  },
};

function StatCard({
  label, value, sub, color, progress,
}: {
  label: string; value: string; sub?: string;
  color: string; progress?: number;
}) {
  return (
    <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-5 flex flex-col gap-2">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{label}</p>
      <p className={`text-3xl font-black tracking-tight ${color}`}>{value}</p>
      {progress !== undefined && (
        <div className="h-1.5 bg-base-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${color.replace('text-', 'bg-')}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {sub && <p className="text-[11px] opacity-40 font-medium">{sub}</p>}
    </div>
  );
}

export default function RuijieSNMPPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspace_id as string;

  const [isPolling, setIsPolling] = useState(true);
  const [intervalMs, setIntervalMs] = useState(3000);
  const [data, setData] = useState<DataPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [routerName, setRouterName] = useState('Ruijie');
  const [latestCpu, setLatestCpu] = useState(0);
  const [latestMem, setLatestMem] = useState(0);
  const [showWalk, setShowWalk]   = useState(false);

  const prevDataRef = useRef({ rxBytes: 0, txBytes: 0, timestamp: 0 });

  const walkHost      = process.env.NEXT_PUBLIC_SNMP_HOST_RUIJIE ?? '';
  const walkCommunity = process.env.NEXT_PUBLIC_SNMP_COMMUNITY_RUIJIE ?? 'public';

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const response = await fetch('/api/snmp/ruijie');
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${response.status}`);
        }
        const rawData = await response.json();

        if (rawData.sysName) setRouterName(rawData.sysName);
        setConnectionStatus('connected');
        setLatestCpu(rawData.cpu || 0);
        setLatestMem(rawData.memory || 0);

        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
        let rxMbps = 0, txMbps = 0;
        const prev = prevDataRef.current;

        if (prev.timestamp > 0 && rawData.timestamp > prev.timestamp) {
          const diffSec = (rawData.timestamp - prev.timestamp) / 1000;
          if (rawData.rxBytes >= prev.rxBytes)
            rxMbps = ((rawData.rxBytes - prev.rxBytes) * 8) / (1_000_000 * diffSec);
          if (rawData.txBytes >= prev.txBytes)
            txMbps = ((rawData.txBytes - prev.txBytes) * 8) / (1_000_000 * diffSec);
        }

        prevDataRef.current = { rxBytes: rawData.rxBytes, txBytes: rawData.txBytes, timestamp: rawData.timestamp };

        setData(prev => {
          const next = [...prev, {
            time: timeStr,
            cpu: rawData.cpu || 0,
            memory: rawData.memory || 0,
            rx: rxMbps > 0 ? parseFloat(rxMbps.toFixed(2)) : 0,
            tx: txMbps > 0 ? parseFloat(txMbps.toFixed(2)) : 0,
          }];
          return next.length > 20 ? next.slice(next.length - 20) : next;
        });

      } catch {
        setConnectionStatus('disconnected');
      }
    };

    if (isPolling) {
      fetchData();
      interval = setInterval(fetchData, intervalMs);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPolling, intervalMs]);

  const latest = data.at(-1);
  const statusMap = {
    connecting:   { label: 'Menghubungkan...', dot: 'bg-warning animate-pulse', badge: 'badge-warning' },
    connected:    { label: 'Terhubung',        dot: 'bg-success animate-pulse', badge: 'badge-success' },
    disconnected: { label: 'Terputus',         dot: 'bg-error',                 badge: 'badge-error'   },
  };
  const status = statusMap[connectionStatus];

  return (<>
    <div className="min-h-screen bg-base-200 text-base-content font-sans pt-6 lg:pl-72">
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => router.push(`/workspaces/${workspaceId}/snmp`)}
                className="btn btn-ghost btn-xs rounded-lg px-2 gap-1 opacity-50 hover:opacity-100"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
                SNMP
              </button>
              <span className="text-base-content/30 text-xs">/</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Ruijie</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary shadow-inner">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="6" rx="2" />
                  <rect x="2" y="14" width="20" height="6" rx="2" />
                  <circle cx="6" cy="7" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="6" cy="17" r="1.2" fill="currentColor" stroke="none" />
                  <line x1="10" y1="6" x2="18" y2="6" />
                  <line x1="10" y1="8" x2="15" y2="8" />
                  <line x1="10" y1="16" x2="18" y2="16" />
                  <line x1="10" y1="18" x2="15" y2="18" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none">{routerName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full badge ${status.badge} badge-outline`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                  <span className="text-[10px] opacity-30 font-bold uppercase tracking-widest">· SNMP v2c</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowWalk(true)}
              className="btn btn-ghost btn-sm rounded-xl font-bold gap-1.5 border border-base-300"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              OID Walk
            </button>
            <select
              value={intervalMs}
              onChange={e => setIntervalMs(Number(e.target.value))}
              disabled={!isPolling}
              className="select select-sm select-bordered rounded-xl text-xs font-bold disabled:opacity-50"
            >
              <option value={1000}>1 Detik</option>
              <option value={3000}>3 Detik</option>
              <option value={5000}>5 Detik</option>
              <option value={10000}>10 Detik</option>
            </select>
            <button
              onClick={() => setIsPolling(p => !p)}
              className={`btn btn-sm rounded-xl font-bold ${isPolling ? 'btn-error' : 'btn-success'}`}
            >
              {isPolling ? (
                <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Jeda</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg> Mulai</>
              )}
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="CPU" value={`${latestCpu}%`} color="text-error" progress={latestCpu} />
          <StatCard label="Memory" value={`${latestMem}%`} color="text-secondary" progress={latestMem} />
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-5 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Download</p>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black text-success">{latest?.rx ?? 0}</span>
              <span className="text-xs opacity-40 mb-1 font-bold">Mbps</span>
            </div>
            <span className="text-[10px] opacity-40 font-bold">↓ Rx Traffic</span>
          </div>
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-5 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Upload</p>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black text-warning">{latest?.tx ?? 0}</span>
              <span className="text-xs opacity-40 mb-1 font-bold">Mbps</span>
            </div>
            <span className="text-[10px] opacity-40 font-bold">↑ Tx Traffic</span>
          </div>
        </div>

        {/* ── CPU & MEMORY CHART ── */}
        <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Utilisasi Sistem</p>
              <h2 className="text-base font-black tracking-tight">CPU &amp; Memory</h2>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-40">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-error inline-block" /> CPU</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-secondary inline-block" /> Memory</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} {...CHART_COMMON}>
                <defs>
                  <linearGradient id="rjGradCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rjGradMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <XAxis dataKey="time" tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v ?? 0}%`]} />
                <Area type="monotone" dataKey="cpu" name="CPU" stroke="#ef4444" strokeWidth={2} fill="url(#rjGradCpu)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="memory" name="Memory" stroke="#a855f7" strokeWidth={2} fill="url(#rjGradMem)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── TRAFFIC CHART ── */}
        <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Bandwidth</p>
              <h2 className="text-base font-black tracking-tight">Trafik Jaringan (Mbps)</h2>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-40">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-success inline-block" /> Download</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-warning inline-block" /> Upload</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} {...CHART_COMMON}>
                <defs>
                  <linearGradient id="rjGradRx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rjGradTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <XAxis dataKey="time" tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} unit=" M" />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v ?? 0} Mbps`]} />
                <Area type="monotone" dataKey="rx" name="Download (Rx)" stroke="#10b981" strokeWidth={2} fill="url(#rjGradRx)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="tx" name="Upload (Tx)" stroke="#f59e0b" strokeWidth={2} fill="url(#rjGradTx)" dot={false} isAnimationActive={false} strokeDasharray="5 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── TRAP PANEL ── */}
        <TrapPanel />

      </div>
    </div>

    {showWalk && (
      <WalkModal
        host={walkHost}
        community={walkCommunity}
        onClose={() => setShowWalk(false)}
      />
    )}
  </>);
}