'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ResponsiveContainer, Area, AreaChart, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface WalkResult { oid: string; label: string; type: string; value: string | number; }
interface WalkResponse { count: number; durationMs: number; groups: Record<string, WalkResult[]>; }

// State to store historical data for charts
type HistoryData = Array<{ time: string; timestampMs?: number; [key: string]: number | string | undefined }>;

interface NetworkInterface {
  id: string;
  name: string;
  rxOid: string;
  txOid: string;
}

const CHART_COMMON = { margin: { top: 0, right: 0, left: 0, bottom: 0 } };

function InterfaceTrafficCard({ iface, data }: { iface: NetworkInterface, data: HistoryData }) {
  // Get latest values for the header
  const latest: any = data.length > 0 ? data[data.length - 1] : {};
  const currentRx = latest[`rx_${iface.id}`] || 0;
  const currentTx = latest[`tx_${iface.id}`] || 0;

  return (
    <div className="bg-base-100 rounded-[32px] border border-base-300 shadow-sm p-6 lg:p-8 flex flex-col h-[320px]">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-[10px] font-black tracking-[0.15em] uppercase opacity-40">Traffic Interface</h4>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
            <h2 className="text-xl font-black">{iface.name}</h2>
          </div>
        </div>
        <div className="border border-pink-500 text-pink-500 rounded-full px-4 py-1 text-[10px] font-black tracking-widest bg-pink-500/5">
          MBPS
        </div>
      </div>

      <div className="flex-1 mt-6 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad_rx_${iface.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.3} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, opacity: 0.4 }} minTickGap={20} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, opacity: 0.4 }} tickFormatter={(v: any) => `${Number(v).toFixed(2)} M`} width={60} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ fontSize: '10px', opacity: 0.5, marginBottom: '4px' }}
              formatter={(val: any) => [`${Number(val).toFixed(2)} Mbps`]}
            />
            {/* RX Line (Solid with Gradient) */}
            <Area name="RX (Downl)" type="monotone" dataKey={`rx_${iface.id}`} stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill={`url(#grad_rx_${iface.id})`} isAnimationActive={false} />
            {/* TX Line (Dashed without Fill) */}
            <Area name="TX (Upload)" type="monotone" dataKey={`tx_${iface.id}`} stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" fill="transparent" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>

        {/* Small live values below the chart */}
        <div className="absolute top-0 right-0 text-right opacity-60 pointer-events-none">
          <p className="text-[10px] font-bold text-pink-500">RX: {Number(currentRx).toFixed(1)} Mbps</p>
          <p className="text-[10px] font-bold text-purple-500">TX: {Number(currentTx).toFixed(1)} Mbps</p>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ data, datakey, color }: { data: any[]; datakey: string; color: string }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="h-10 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} {...CHART_COMMON}>
          <Tooltip 
            contentStyle={{ fontSize: '10px', borderRadius: '8px', padding: '4px 8px', borderColor: 'transparent', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            labelStyle={{ display: 'none' }}
            isAnimationActive={false}
          />
          <Area type="monotone" dataKey={datakey} stroke={color} strokeWidth={2} fillOpacity={0.2} fill={color} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RuijieDynamicContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const host = searchParams.get('host');
  const community = searchParams.get('community');
  const device = searchParams.get('device') || 'generic';

  const [walkStatus, setWalkStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [errorMsg, setErrorMsg]     = useState('');
  
  const [staticData, setStaticData] = useState<Record<string, WalkResult[]>>({});
  const [metricOids, setMetricOids] = useState<WalkResult[]>([]);
  const [pollingOids, setPollingOids] = useState<string[]>([]);
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  
  // Realtime state
  const [history, setHistory]       = useState<HistoryData>([]);
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({});
  const [isPolling, setIsPolling]   = useState(true);
  
  const lastPollRef = useRef<{ timestamp: number, bytesByOid: Record<string, number> }>({
    timestamp: 0,
    bytesByOid: {}
  });

  // Colors mapping for charts to make them look premium
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

  useEffect(() => {
    if (!host || !community) {
      setErrorMsg('Parameter host atau community tidak ditemukan di URL.');
      setWalkStatus('error');
      return;
    }

    const initWalk = async () => {
      setWalkStatus('loading');
      try {
        const p = new URLSearchParams({ host, community, device, limit: '2500' });
        const res = await fetch(`/api/snmp/walk?${p}`);
        const data: WalkResponse = await res.json();
        
        if (!res.ok) throw new Error((data as any).error || 'Gagal melakukan SNMP Walk');

        // Extract and separate data
        const staticRecords: Record<string, WalkResult[]> = {};
        const metrics: WalkResult[] = [];

        Object.entries(data.groups).forEach(([groupName, oids]) => {
          staticRecords[groupName] = [];
          oids.forEach(r => {
            const isNumeric = r.type.includes('Counter') || r.type.includes('Gauge') || r.type === 'Integer';
            const valueAsNum = Number(r.value);
            
            if (isNumeric && !Number.isNaN(valueAsNum)) {
              metrics.push(r);
              setCurrentValues(prev => ({ ...prev, [r.oid]: valueAsNum }));
            } else {
              staticRecords[groupName].push(r);
            }
          });
        });

        // --- INTERFACE DETECTION PASS ---
        const ifDescrs = new Map<string, string>();
        const ifInOids = new Map<string, string>();
        const ifOutOids = new Map<string, string>();

        Object.values(data.groups).flat().forEach(r => {
          // ifDescr (standard: .1.3.6.1.2.1.2.2.1.2)
          const descrMatch = r.oid.match(/^1\.3\.6\.1\.2\.1\.2\.2\.1\.2\.([\d\.]+)$/);
          // ifName (alternative: .1.3.6.1.2.1.31.1.1.1.1)
          const nameMatch = r.oid.match(/^1\.3\.6\.1\.2\.1\.31\.1\.1\.1\.1\.([\d\.]+)$/);
          
          const ifId = descrMatch ? descrMatch[1] : (nameMatch ? nameMatch[1] : null);
          if (ifId) {
            // override with ifName if it comes up (usually prettier like Gi1/0/1)
            if (!ifDescrs.has(ifId) || nameMatch) {
              ifDescrs.set(ifId, String(r.value));
            }
          }
          
          const hcInMatch = r.oid.match(/^1\.3\.6\.1\.2\.1\.31\.1\.1\.1\.6\.([\d\.]+)$/);
          const inMatch = r.oid.match(/^1\.3\.6\.1\.2\.1\.2\.2\.1\.10\.([\d\.]+)$/);
          const inId = hcInMatch ? hcInMatch[1] : (inMatch ? inMatch[1] : null);
          if (inId) ifInOids.set(inId, r.oid);

          const hcOutMatch = r.oid.match(/^1\.3\.6\.1\.2\.1\.31\.1\.1\.1\.10\.([\d\.]+)$/);
          const outMatch = r.oid.match(/^1\.3\.6\.1\.2\.1\.2\.2\.1\.16\.([\d\.]+)$/);
          const outId = hcOutMatch ? hcOutMatch[1] : (outMatch ? outMatch[1] : null);
          if (outId) ifOutOids.set(outId, r.oid);
        });

        const discoveredInterfaces: NetworkInterface[] = [];
        ifDescrs.forEach((name, id) => {
          const rxOid = ifInOids.get(id);
          const txOid = ifOutOids.get(id);
          if (rxOid && txOid && !name.toLowerCase().includes('loopback') && name !== 'lo') {
            discoveredInterfaces.push({ id, name, rxOid, txOid });
          }
        });
        
        // Exclude interface traffic OIDs from the generic metrics list so they don't appear twice
        const trafficOidsSet = new Set(discoveredInterfaces.flatMap(i => [i.rxOid, i.txOid]));
        const filteredMetrics = metrics.filter(m => !trafficOidsSet.has(m.oid));

        // Prioritize traffic OIDs in the polling mechanism so they don't get truncated by limits
        const targetOidsToPoll = [
          ...Array.from(trafficOidsSet),
          ...filteredMetrics.map(m => m.oid)
        ].slice(0, 300); // Max 300 OIDs to poll natively without straining equipment

        setInterfaces(discoveredInterfaces);
        setStaticData(staticRecords);
        setMetricOids(metrics); // keep all for rendering map
        setPollingOids(targetOidsToPoll);
        setWalkStatus('done');
      } catch (err: any) {
        setErrorMsg(err.message);
        setWalkStatus('error');
      }
    };

    initWalk();
  }, [host, community, device]);

  // Polling mechanism
  useEffect(() => {
    if (walkStatus !== 'done' || !isPolling || pollingOids.length === 0) return;

    let intervalId: NodeJS.Timeout;

    const pollMetrics = async () => {
      try {
        const res = await fetch('/api/snmp/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host, community,
            oids: pollingOids
          })
        });

        if (!res.ok) return;

        const { data } = await res.json();
        const nowMs = Date.now();
        const nowStr = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const newPoint: any = { time: nowStr, timestampMs: nowMs };
        const newCurrent: any = {};

        // Normal metrics
        Object.entries(data).forEach(([oid, val]) => {
          const num = Number(val);
          if (!Number.isNaN(num)) {
            newPoint[oid] = num;
            newCurrent[oid] = num;
          }
        });

        // Compute interface bandwidth
        const last = lastPollRef.current;
        if (last.timestamp > 0) {
          const deltaT = (nowMs - last.timestamp) / 1000;
          if (deltaT > 0) {
            interfaces.forEach(iface => {
              const currentRx = Number(data[iface.rxOid]);
              const currentTx = Number(data[iface.txOid]);
              const lastRx = last.bytesByOid[iface.rxOid];
              const lastTx = last.bytesByOid[iface.txOid];

              if (!Number.isNaN(currentRx) && !Number.isNaN(lastRx)) {
                let diffRx = currentRx - lastRx;
                if (diffRx < 0) diffRx = 0; // counter rollover
                newPoint[`rx_${iface.id}`] = (diffRx * 8) / deltaT / 1_000_000;
              } else {
                newPoint[`rx_${iface.id}`] = 0;
              }

              if (!Number.isNaN(currentTx) && !Number.isNaN(lastTx)) {
                let diffTx = currentTx - lastTx;
                if (diffTx < 0) diffTx = 0; 
                newPoint[`tx_${iface.id}`] = (diffTx * 8) / deltaT / 1_000_000;
              } else {
                newPoint[`tx_${iface.id}`] = 0;
              }
            });
          }
        }

        // Save raw bytes for next calculation
        const newBytes: Record<string, number> = {};
        interfaces.forEach(iface => {
          newBytes[iface.rxOid] = Number(data[iface.rxOid]);
          newBytes[iface.txOid] = Number(data[iface.txOid]);
        });
        lastPollRef.current = { timestamp: nowMs, bytesByOid: newBytes };

        setCurrentValues(prev => ({ ...prev, ...newCurrent }));
        
        setHistory(prev => {
          const combined = [...prev, newPoint];
          if (combined.length > 30) return combined.slice(-30);
          return combined;
        });

      } catch (e) {
        // Silent catch for polling
        console.error('Polling error', e);
      }
    };

    pollMetrics(); // initial poll right away
    intervalId = setInterval(pollMetrics, 4000);

    return () => clearInterval(intervalId);
  }, [walkStatus, isPolling, pollingOids, host, community, interfaces]);

  if (walkStatus === 'loading') {
    return (
      <div className="min-h-screen bg-base-200 text-base-content flex flex-col items-center justify-center p-8 lg:pl-72">
        <span className="loading loading-spinner text-primary w-16 h-16 opacity-80 mb-6"></span>
        <h2 className="text-2xl font-black tracking-tight mb-2">Analyzing Target</h2>
        <p className="opacity-50 text-sm max-w-sm text-center">Melakukan sub-tree SNMP walk untuk menemukan OID yang tersedia. Proses ini bisa memakan 10–60 detik...</p>
      </div>
    );
  }

  if (walkStatus === 'error') {
    return (
      <div className="min-h-screen bg-base-200 text-base-content p-8 lg:pl-72 flex flex-col items-center justify-center">
        <div className="alert alert-error max-w-lg rounded-3xl shadow-lg p-6">
          <svg className="w-8 h-8 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          <div>
            <h3 className="font-black text-lg">Discovery Gagal</h3>
            <p className="text-xs mt-1 opacity-80">{errorMsg}</p>
          </div>
        </div>
        <button onClick={() => router.back()} className="btn btn-ghost mt-6 rounded-xl font-bold">Kembali</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 text-base-content font-sans pt-6 lg:pl-72 pb-20">
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button onClick={() => router.back()} className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest opacity-40 hover:opacity-100 transition-opacity mb-2">
               ← KEMBALI
            </button>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              Dynamic Monitoring
              <span className="badge badge-success badge-sm font-black text-[10px] tracking-widest gap-1 p-3 px-4">LIVE</span>
            </h1>
            <p className="text-xs opacity-50 font-mono mt-1 pr-6 break-all">
              Target: {host} <span className="opacity-40 px-1">/</span> {community} <span className="opacity-40 px-1">/</span> {interfaces.length} Interfaces
            </p>
          </div>
          
          <button 
            onClick={() => setIsPolling(!isPolling)}
            className={`btn btn-sm rounded-xl font-bold shrink-0 shadow-sm ${isPolling ? 'btn-error bg-error/10 text-error border-error/20 hover:bg-error/20' : 'btn-success bg-success/10 text-success border-success/20 hover:bg-success/20'}`}
          >
             {isPolling ? '⏸ PAUSE POLLING' : '▶ RESUME POLLING'}
          </button>
        </div>

        {/* BANDWIDTH INTERFACES */}
        {interfaces.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-40 px-1">Network Interfaces Bandwidth</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {interfaces.map(iface => (
                <InterfaceTrafficCard key={iface.id} iface={iface} data={history} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function RuijieDynamicPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-base-200 text-base-content flex flex-col items-center justify-center p-8 lg:pl-72">
        <span className="loading loading-spinner text-primary w-16 h-16 opacity-80 mb-6"></span>
      </div>
    }>
      <RuijieDynamicContent />
    </React.Suspense>
  )
}

