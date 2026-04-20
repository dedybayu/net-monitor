'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from 'recharts';

interface DataPoint {
  time: string;
  cpu: number;
  memory: number;
  eth6Rx: number;
  eth6Tx: number;
  eth7Rx: number;
  eth7Tx: number;
}

function calcMbps(newBytes: number, oldBytes: number, diffSec: number): number {
  if (oldBytes === 0 || newBytes < oldBytes || diffSec <= 0) return 0;
  return parseFloat(((newBytes - oldBytes) * 8 / 1_000_000 / diffSec).toFixed(2));
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
    <div className={`bg-base-100 rounded-3xl border border-base-300 shadow-sm p-5 flex flex-col gap-2`}>
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

export default function MikrotikSNMPPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspace_id as string;

  const [isPolling, setIsPolling] = useState(true);
  const [intervalMs, setIntervalMs] = useState(3000);
  const [data, setData] = useState<DataPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [routerName, setRouterName] = useState('MikroTik');
  const [latestCpu, setLatestCpu] = useState(0);
  const [latestMem, setLatestMem] = useState(0);
  const [ramUsedMB, setRamUsedMB] = useState(0);
  const [ramTotalMB, setRamTotalMB] = useState(0);

  const prevRef = useRef({ eth6Rx: 0, eth6Tx: 0, eth7Rx: 0, eth7Tx: 0, timestamp: 0 });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/snmp/mikrotik');
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const raw = await res.json();

        if (raw.sysName) setRouterName(raw.sysName);
        setConnectionStatus('connected');
        setLatestCpu(raw.cpu ?? 0);
        setLatestMem(raw.memory ?? 0);
        if (raw.ramUsedMB) setRamUsedMB(raw.ramUsedMB);
        if (raw.ramTotalMB) setRamTotalMB(raw.ramTotalMB);

        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
        const prev = prevRef.current;
        let eth6Rx = 0, eth6Tx = 0, eth7Rx = 0, eth7Tx = 0;

        if (prev.timestamp > 0 && raw.timestamp > prev.timestamp) {
          const diffSec = (raw.timestamp - prev.timestamp) / 1000;
          eth6Rx = calcMbps(raw.eth6RxBytes, prev.eth6Rx, diffSec);
          eth6Tx = calcMbps(raw.eth6TxBytes, prev.eth6Tx, diffSec);
          eth7Rx = calcMbps(raw.eth7RxBytes, prev.eth7Rx, diffSec);
          eth7Tx = calcMbps(raw.eth7TxBytes, prev.eth7Tx, diffSec);
        }

        prevRef.current = {
          eth6Rx: raw.eth6RxBytes, eth6Tx: raw.eth6TxBytes,
          eth7Rx: raw.eth7RxBytes, eth7Tx: raw.eth7TxBytes,
          timestamp: raw.timestamp,
        };

        setData(prev => {
          const next = [...prev, { time: timeStr, cpu: raw.cpu ?? 0, memory: raw.memory ?? 0, eth6Rx, eth6Tx, eth7Rx, eth7Tx }];
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
    connecting:    { label: 'Menghubungkan...', dot: 'bg-warning animate-pulse', badge: 'badge-warning' },
    connected:     { label: 'Terhubung',        dot: 'bg-success animate-pulse', badge: 'badge-success' },
    disconnected:  { label: 'Terputus',         dot: 'bg-error',                 badge: 'badge-error'   },
  };
  const status = statusMap[connectionStatus];

  return (
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
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">MikroTik</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-info/10 border border-info/20 flex items-center justify-center text-info shadow-inner">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="3" />
                  <circle cx="7" cy="12" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="11" cy="12" r="1.5" fill="currentColor" stroke="none" />
                  <line x1="15" y1="9.5" x2="19" y2="9.5" />
                  <line x1="15" y1="12" x2="19" y2="12" />
                  <line x1="15" y1="14.5" x2="19" y2="14.5" />
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
          <StatCard
            label="CPU"
            value={`${latestCpu}%`}
            color="text-error"
            progress={latestCpu}
          />
          <StatCard
            label="Memory"
            value={`${latestMem}%`}
            color="text-info"
            progress={latestMem}
            sub={ramTotalMB > 0 ? `${ramUsedMB.toLocaleString()} / ${ramTotalMB.toLocaleString()} MB` : undefined}
          />
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-5 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">ether6</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-black text-success">{latest?.eth6Rx ?? 0}</span>
              <span className="text-xs opacity-40 mb-1 font-bold">Mbps ↓</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-black text-success/60">{latest?.eth6Tx ?? 0}</span>
              <span className="text-xs opacity-40 mb-1 font-bold">Mbps ↑</span>
            </div>
          </div>
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-5 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">ether7</p>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-black text-secondary">{latest?.eth7Rx ?? 0}</span>
              <span className="text-xs opacity-40 mb-1 font-bold">Mbps ↓</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-black text-secondary/60">{latest?.eth7Tx ?? 0}</span>
              <span className="text-xs opacity-40 mb-1 font-bold">Mbps ↑</span>
            </div>
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
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-info inline-block" /> Memory</span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} {...CHART_COMMON}>
                <defs>
                  <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <XAxis dataKey="time" tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v ?? 0}%`]} />
                <Area type="monotone" dataKey="cpu" name="CPU" stroke="#ef4444" strokeWidth={2} fill="url(#gradCpu)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="memory" name="Memory" stroke="#3b82f6" strokeWidth={2} fill="url(#gradMem)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── INTERFACE CHARTS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ether6 */}
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Traffic Interface</p>
                <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success" />
                  ether6
                </h2>
              </div>
              <span className="badge badge-success badge-outline text-[9px] font-black uppercase tracking-widest">Mbps</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} {...CHART_COMMON}>
                  <defs>
                    <linearGradient id="gradE6Rx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradE6Tx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} unit=" M" />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v ?? 0} Mbps`]} />
                  <Area type="monotone" dataKey="eth6Rx" name="Download ↓" stroke="#10b981" strokeWidth={2} fill="url(#gradE6Rx)" dot={false} isAnimationActive={false} />
                  <Area type="monotone" dataKey="eth6Tx" name="Upload ↑" stroke="#14b8a6" strokeWidth={2} fill="url(#gradE6Tx)" dot={false} isAnimationActive={false} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ether7 */}
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Traffic Interface</p>
                <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  ether7
                </h2>
              </div>
              <span className="badge badge-secondary badge-outline text-[9px] font-black uppercase tracking-widest">Mbps</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} {...CHART_COMMON}>
                  <defs>
                    <linearGradient id="gradE7Rx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradE7Tx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} unit=" M" />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v ?? 0} Mbps`]} />
                  <Area type="monotone" dataKey="eth7Rx" name="Download ↓" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradE7Rx)" dot={false} isAnimationActive={false} />
                  <Area type="monotone" dataKey="eth7Tx" name="Upload ↑" stroke="#a855f7" strokeWidth={2} fill="url(#gradE7Tx)" dot={false} isAnimationActive={false} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── COMBINED CHART ── */}
        <div className="bg-base-100 rounded-3xl border border-base-300 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Perbandingan</p>
              <h2 className="text-base font-black tracking-tight">ether6 vs ether7 — Download (Mbps)</h2>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} {...CHART_COMMON}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <XAxis dataKey="time" tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} unit=" M" />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v ?? 0} Mbps`]} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px', opacity: 0.6 }} />
                <Line type="monotone" dataKey="eth6Rx" name="ether6 ↓" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="eth6Tx" name="ether6 ↑" stroke="#14b8a6" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="eth7Rx" name="ether7 ↓" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="eth7Tx" name="ether7 ↑" stroke="#a855f7" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}