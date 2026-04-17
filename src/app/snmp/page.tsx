'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
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

export default function SNMPDashboard() {
  const [isPolling, setIsPolling] = useState(true);
  const [intervalMs, setIntervalMs] = useState(3000);
  const [data, setData] = useState<DataPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('Menghubungkan...');
  const [routerName, setRouterName] = useState('MikroTik');
  const [latestCpu, setLatestCpu] = useState(0);
  const [latestMem, setLatestMem] = useState(0);
  const [ramUsedMB, setRamUsedMB] = useState(0);
  const [ramTotalMB, setRamTotalMB] = useState(0);

  const prevRef = useRef({
    eth6Rx: 0, eth6Tx: 0,
    eth7Rx: 0, eth7Tx: 0,
    timestamp: 0,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/snmp');
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const raw = await res.json();

        if (raw.sysName) setRouterName(raw.sysName);
        setConnectionStatus('Terhubung');
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
          eth6Rx: raw.eth6RxBytes,
          eth6Tx: raw.eth6TxBytes,
          eth7Rx: raw.eth7RxBytes,
          eth7Tx: raw.eth7TxBytes,
          timestamp: raw.timestamp,
        };

        const point: DataPoint = {
          time: timeStr,
          cpu: raw.cpu ?? 0,
          memory: raw.memory ?? 0,
          eth6Rx, eth6Tx, eth7Rx, eth7Tx,
        };

        setData(prev => {
          const next = [...prev, point];
          return next.length > 20 ? next.slice(next.length - 20) : next;
        });

      } catch (e: any) {
        console.error('Error SNMP:', e.message);
        setConnectionStatus('Terputus');
      }
    };

    if (isPolling) {
      fetchData();
      interval = setInterval(fetchData, intervalMs);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPolling, intervalMs]);

  const chartProps = {
    margin: { top: 5, right: 20, left: 0, bottom: 5 },
  };
  const tooltipStyle = {
    contentStyle: { borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.2)' },
  };

  return (
    <div className="min-h-screen bg-base-100 lg:pl-72 pt-20">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* ── HEADER ─────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Monitoring {routerName}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${connectionStatus === 'Terhubung' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs font-bold text-base-content/50">SNMP · {connectionStatus}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={intervalMs}
              onChange={e => setIntervalMs(Number(e.target.value))}
              disabled={!isPolling}
              className="text-xs border border-base-200 rounded-xl bg-base-200/50 px-3 py-2 outline-none disabled:opacity-50"
            >
              <option value={1000}>1 Detik</option>
              <option value={3000}>3 Detik</option>
              <option value={5000}>5 Detik</option>
              <option value={10000}>10 Detik</option>
            </select>
            <button
              onClick={() => setIsPolling(p => !p)}
              className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors ${isPolling ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
            >
              {isPolling ? 'Jeda' : 'Mulai'}
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ──────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* CPU */}
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-base-200 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-1">CPU</p>
            <p className="text-3xl font-black text-red-400">{latestCpu}%</p>
            <div className="mt-2 h-1.5 bg-base-200 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 rounded-full transition-all duration-500" style={{ width: `${latestCpu}%` }} />
            </div>
          </div>
          {/* Memory */}
          <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-base-200 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-1">Memory</p>
            <p className="text-3xl font-black text-blue-400">{latestMem}%</p>
            <div className="mt-2 h-1.5 bg-base-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${latestMem}%` }} />
            </div>
            {ramTotalMB > 0 && (
              <p className="text-[11px] text-base-content/50 mt-2 font-medium">
                {ramUsedMB.toLocaleString()} MB
                <span className="text-base-content/30"> / {ramTotalMB.toLocaleString()} MB</span>
              </p>
            )}
          </div>
          {/* ether6 latest */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-base-200 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-1">ether6 (Rx/Tx)</p>
            <p className="text-xl font-black text-emerald-400">
              {data.at(-1)?.eth6Rx ?? 0} <span className="text-sm text-base-content/40">Mbps ↓</span>
            </p>
            <p className="text-xl font-black text-teal-400">
              {data.at(-1)?.eth6Tx ?? 0} <span className="text-sm text-base-content/40">Mbps ↑</span>
            </p>
          </div>
          {/* ether7 latest */}
          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-base-200 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-1">ether7 (Rx/Tx)</p>
            <p className="text-xl font-black text-violet-400">
              {data.at(-1)?.eth7Rx ?? 0} <span className="text-sm text-base-content/40">Mbps ↓</span>
            </p>
            <p className="text-xl font-black text-purple-400">
              {data.at(-1)?.eth7Tx ?? 0} <span className="text-sm text-base-content/40">Mbps ↑</span>
            </p>
          </div>
        </div>

        {/* ── CHART ROW 1: CPU & Memory ────────────── */}
        <div className="bg-base-100 border border-base-200 rounded-2xl p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-base-content/40 mb-4">CPU & Memori (%)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.2} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.2} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="cpu" name="CPU (%)" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="memory" name="Memory (%)" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── CHART ROW 2: ether6 & ether7 ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ether6 */}
          <div className="bg-base-100 border border-base-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-base-content/40">ether6 — Trafik (Mbps)</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} {...chartProps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.2} />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.2} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="eth6Rx" name="Download ↓" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="eth6Tx" name="Upload ↑" stroke="#14b8a6" strokeWidth={2} dot={false} isAnimationActive={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ether7 */}
          <div className="bg-base-100 border border-base-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-base-content/40">ether7 — Trafik (Mbps)</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} {...chartProps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.2} />
                  <YAxis tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.2} />
                  <Tooltip {...tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="eth7Rx" name="Download ↓" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="eth7Tx" name="Upload ↑" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── COMBINED CHART ───────────────────────── */}
        <div className="bg-base-100 border border-base-200 rounded-2xl p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-base-content/40 mb-4">ether6 vs ether7 — Perbandingan Download (Mbps)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.2} />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" strokeOpacity={0.2} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="eth6Rx" name="ether6 ↓ Rx" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="eth6Tx" name="ether6 ↑ Tx" stroke="#14b8a6" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="eth7Rx" name="ether7 ↓ Rx" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="eth7Tx" name="ether7 ↑ Tx" stroke="#a855f7" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}