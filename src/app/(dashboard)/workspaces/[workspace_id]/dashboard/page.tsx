'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  MonitoringTarget,
  Device,
  StatusApiResponse
} from '@/src/types/monitor';
import { 
    Activity, Server, Network, Clock, 
    CheckCircle, XCircle, ChevronRight, 
    AlertTriangle, Zap, ShieldCheck, BarChart3, Plus
} from 'lucide-react';
import { AddDeviceModal } from './components/AddDeviceModal';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface ApiError extends Error {
  status?: number;
}

const getFetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || 'Terjadi kesalahan') as ApiError;
    error.status = res.status;
    throw error;
  }
  return data;
};

const statusFetcher = async (key: [string, MonitoringTarget[]] | null): Promise<StatusApiResponse> => {
  if (!key) return { nodes: [] };
  const [url, payload] = key;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets: payload }),
  });
  if (!res.ok) throw new Error('Gagal mengambil data monitoring');
  return res.json();
};

export default function MonitorPage() {
  const params = useParams();
  const workspace_id = params?.workspace_id as string;
  const workspaceIdInt = parseInt(workspace_id, 10);
  const [countdown, setCountdown] = useState<number>(3);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const router = useRouter();

  const { data: wsData, error: wsError, isLoading: wsLoading } = useSWR(
    workspaceIdInt ? `/api/workspaces/${workspaceIdInt}` : null,
    getFetcher
  );

  const { data: devices, mutate: mutateDevices } = useSWR<Device[]>(
    wsData ? `/api/workspaces/${workspaceIdInt}/nodes` : null,
    getFetcher
  );

  const targetPayload = useMemo<MonitoringTarget[]>(() => {
    if (!devices) return [];
    return devices.map((d) => {
      if (d.target.includes(':')) {
        const [ip, port] = d.target.split(':');
        return { ip, port: parseInt(port, 10) };
      }
      return { ip: d.target, port: 0 };
    });
  }, [devices]);

  const { data: apiData } = useSWR<StatusApiResponse, Error, [string, MonitoringTarget[]] | null>(
    targetPayload.length > 0 ? ['/api/status', targetPayload] : null,
    statusFetcher,
    {
      refreshInterval: 3000,
      onSuccess: () => setCountdown(3),
    }
  );

  const getDeviceData = (device: Device) => {
    const relatedNodes = apiData?.nodes.filter((n) => {
      const ipNode = n.target.split(':')[0];
      const ipDevice = device.target.split(':')[0];
      return ipNode === ipDevice;
    }) || [];

    if (relatedNodes.length === 0) return { status: 'unknown', latency: '---' };

    const onlineNode = relatedNodes.find((n) => n.status.toLowerCase() === 'online');
    if (onlineNode) return { status: 'online', latency: onlineNode.latency };

    return { status: 'offline', latency: 'N/A' };
  };

  const deviceStats = useMemo(() => {
    if (!devices || devices.length === 0) return { total: 0, online: 0, avgLatency: 0 };

    let online = 0;
    let totalLatency = 0;

    devices.forEach((device) => {
      const data = getDeviceData(device);
      if (data.status === 'online') {
        online++;
        const latencyValue = parseInt(data.latency);
        if (!isNaN(latencyValue)) totalLatency += latencyValue;
      }
    });

    return {
      total: devices.length,
      online,
      avgLatency: online > 0 ? Math.round(totalLatency / online) : 0
    };
  }, [devices, apiData]);

  const healthStatus = useMemo(() => {
    if (deviceStats.total === 0) return { label: 'No Data', color: 'text-base-content/50', bg: 'bg-base-200', icon: <AlertTriangle size={32} /> };
    if (deviceStats.online === deviceStats.total) return { label: 'Healthy', color: 'text-success', bg: 'bg-success/10', icon: <ShieldCheck size={32} /> };
    if (deviceStats.online === 0) return { label: 'Down', color: 'text-error', bg: 'bg-error/10', icon: <XCircle size={32} /> };
    return { label: 'Issues Found', color: 'text-warning', bg: 'bg-warning/10', icon: <AlertTriangle size={32} /> };
  }, [deviceStats]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 3 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (wsLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 gap-4 pt-16 lg:pl-72 z-1 relative">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="mt-2 text-[10px] font-black tracking-[0.35em] uppercase opacity-40 animate-pulse">Initializing Data...</p>
    </div>
  );

  if (wsError) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-base-200 pt-16 lg:pl-72 z-1">
      <AlertTriangle size={64} className="text-error opacity-20 mb-4" />
      <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Connection Error</h2>
      <p className="opacity-60 mb-6">{wsError.message}</p>
      <button onClick={() => window.location.reload()} className="btn btn-primary rounded-xl font-bold px-8 shadow-sm">
        Retry Connection
      </button>
    </div>
  );

  const cycleProgress = (3 - countdown) * (100 / 3);

  return (
    <div className="min-h-screen z-1 bg-base-200 text-base-content font-sans pt-16 lg:pl-72 transition-all">
      <main className="p-6 md:p-10 max-w-xxl mx-auto space-y-10">
        
        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-base-100 p-8 rounded-[2rem] border border-base-300 shadow-sm relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -right-10 -top-10 opacity-[0.03] text-primary rotate-12 pointer-events-none">
             <Activity size={300} />
          </div>

          <div className="relative z-10 w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-inner font-black text-xl">
                 {wsData?.data.workspace_name.charAt(0)}
              </div>
              <p className="text-[10px] font-black tracking-[0.35em] uppercase opacity-40 flex items-center gap-2">
                 <span className="inline-block h-px w-6 bg-primary"></span>
                 Dashboard Monitoring
              </p>
            </div>
            
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 w-full">
                <div>
                   <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-none mb-2">
                     {wsData?.data.workspace_name} <span className="text-primary">Overview</span>
                   </h1>
                   <p className="text-sm font-bold opacity-50 uppercase tracking-widest flex items-center gap-2 mt-3">
                     {wsData?.data.workspace_description || 'Active Network Topology & Monitoring'}
                   </p>
                </div>

                {/* Live Sync Indicator */}
                <div className="flex items-center gap-6 bg-base-200/50 p-4 rounded-2xl border border-base-300 backdrop-blur-sm self-start xl:self-auto">
                    <div className="flex flex-col gap-1 w-24">
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-50 block">Live Cycle</span>
                       <progress className="progress progress-primary w-full h-1.5" value={cycleProgress} max="100"></progress>
                    </div>
                    <div className="w-[1px] h-8 bg-base-300"></div>
                    <Link href={`/workspaces/${workspaceIdInt}/topology`} className="btn btn-primary btn-sm rounded-xl px-5 font-bold shadow-sm group">
                       Topology Map
                       <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
          </div>
        </div>

        {/* ── STATS DASHBOARD ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Nodes Tracked */}
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-6 flex flex-col relative overflow-hidden group hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="bg-primary/10 text-primary p-3 rounded-xl z-10 group-hover:scale-110 transition-transform">
                 <Server size={24} />
               </div>
            </div>
            <div className="z-10 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Nodes Tracked</p>
              <div className="flex items-end gap-2">
                 <p className="text-4xl font-black leading-none text-base-content">{deviceStats.total}</p>
                 <span className="text-[10px] font-bold opacity-40 mb-1">Devices</span>
              </div>
            </div>
          </div>

          {/* Network Health */}
          <div className={`bg-base-100 rounded-[2rem] border border-base-300 p-6 flex flex-col relative overflow-hidden group hover:border-base-content/20 transition-colors`}>
            <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-10 transition-opacity ${healthStatus.color}`}>
                <Activity size={120} />
            </div>
            <div className="flex justify-between items-start mb-4 z-10">
               <div className={`${healthStatus.bg} ${healthStatus.color} p-3 rounded-xl shadow-inner group-hover:scale-110 transition-transform`}>
                 {healthStatus.icon}
               </div>
            </div>
            <div className="z-10 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Network Health</p>
              <p className={`text-2xl font-black uppercase tracking-tight ${healthStatus.color}`}>{healthStatus.label}</p>
            </div>
          </div>

          {/* Avg Latency */}
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-6 flex flex-col relative overflow-hidden group hover:border-secondary/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="bg-secondary/10 text-secondary p-3 rounded-xl z-10 group-hover:scale-110 transition-transform">
                 <Zap size={24} />
               </div>
               <div className="badge badge-sm border-none bg-base-200 text-[9px] font-bold uppercase opacity-60">Avg</div>
            </div>
            <div className="z-10 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Response Time</p>
              <p className="text-4xl font-black text-secondary font-mono flex items-end gap-1 leading-none">
                 {deviceStats.avgLatency}<span className="text-sm font-bold opacity-50 mb-1">ms</span>
              </p>
            </div>
          </div>

          {/* Refresh Cycle */}
          <div className="bg-base-100 rounded-[2rem] border border-base-300 p-6 flex flex-col relative overflow-hidden group hover:border-base-content/20 transition-colors">
            <div className="flex justify-between items-start mb-4">
               <div className="bg-base-200 text-base-content/60 p-3 rounded-xl z-10 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                 <Clock size={24} />
               </div>
            </div>
            <div className="z-10 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Next Sync In</p>
              <p className="text-4xl font-black uppercase tracking-tight font-mono text-base-content/80 flex items-end gap-1 leading-none">
                 {countdown}<span className="text-sm font-bold opacity-50 mb-1">sec</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── LATENCY CHART ── */}
        <LatencyChartSection workspaceId={workspaceIdInt} />

        {/* ── NODES LISTING ── */}
        <div className="space-y-6 pt-4">
          <div className="flex items-end justify-between border-b border-base-300 pb-4">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  <Network size={24} className="text-primary" />
                  Monitored Devices
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-xs font-black opacity-30 tabular-nums uppercase tracking-widest hidden sm:inline-block">
                    {devices?.length || 0} Targets
                </span>
                <button onClick={() => setIsAddingNode(true)} className="btn btn-primary btn-sm rounded-lg font-bold shadow-sm">
                   <Plus size={16} /> Add Device
                </button>
              </div>
          </div>

          {isAddingNode && (
            <AddDeviceModal
              workspaceId={workspaceIdInt}
              onClose={() => setIsAddingNode(false)}
              onSuccess={() => {
                setIsAddingNode(false);
                mutateDevices();
              }}
            />
          )}

          {!devices || devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center bg-base-100 rounded-[3rem] border-2 border-dashed border-base-300 p-16 text-center opacity-70">
                <div className="bg-base-200 p-6 rounded-full mb-6">
                    <Server size={48} className="opacity-20 text-primary" />
                </div>
                <h3 className="font-black text-2xl tracking-tight uppercase mb-2">No Devices Configured</h3>
                <p className="text-sm font-bold max-w-sm mx-auto opacity-50 leading-relaxed">
                    Begin tracking your infrastructure by adding monitoring nodes from the Topology view.
                </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {devices.map((device) => {
                const deviceData = getDeviceData(device);
                const isOnline = deviceData.status === 'online';
                
                const latencyInt = parseInt(deviceData.latency);
                let latencyColorClass = 'text-success';
                let latencyBgClass = 'bg-success/10 border-success/20';
                
                if (isOnline && !isNaN(latencyInt)) {
                    if (latencyInt > 100) { latencyColorClass = 'text-warning'; latencyBgClass = 'bg-warning/10 border-warning/20'; }
                    if (latencyInt > 300) { latencyColorClass = 'text-error'; latencyBgClass = 'bg-error/10 border-error/20'; }
                }

                return (
                  <div key={device.id} className="flex flex-col">
                    <div
                      onClick={() => router.push(`/workspaces/${workspaceIdInt}/nodes/${device.id}`)}
                      className={`p-6 rounded-[2rem] border-none shadow-md transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden bg-base-100 group cursor-pointer ${
                          isOnline ? 'hover:shadow-primary/10' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* Visual Pulse for Online */}
                      {isOnline && (
                          <div className="absolute top-0 left-0 w-1 h-full bg-success opacity-50"></div>
                      )}
                      
                      <div className="flex items-center gap-5 z-10 w-full sm:w-auto">
                        {/* Status Icon */}
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-colors ${
                             isOnline ? 'bg-success/10 border-success/20 text-success' : 'bg-error/10 border-error/20 text-error'
                        }`}>
                            {isOnline ? <CheckCircle size={28} /> : <XCircle size={28} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h3 className="font-black tracking-tight text-xl truncate group-hover:text-primary transition-colors leading-none">
                              {device.name}
                            </h3>
                            <div className={`badge badge-sm uppercase tracking-widest text-[8px] font-black px-1.5 py-2 border-none ${isOnline? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold opacity-60 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 bg-base-200 px-2 py-1 rounded-md text-base-content/80 overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px] sm:max-w-[200px]">
                                {device.target}
                            </span>
                            <span className="flex items-center gap-1"><Activity size={12}/> Met: {device.method}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-base-200 pt-4 sm:pt-0">
                          <div className="flex flex-col sm:items-end">
                              <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Response</span>
                              {isOnline ? (
                                  <div className={`px-4 py-2 rounded-xl font-mono text-xl font-black leading-none border transition-colors ${latencyBgClass} ${latencyColorClass}`}>
                                      {deviceData.latency}
                                      <span className="text-[10px] ml-1 opacity-60">ms</span>
                                  </div>
                              ) : (
                                  <div className="px-4 py-2 rounded-xl bg-error/10 text-error border border-error/20 font-mono text-xl font-black leading-none">
                                      N/A
                                  </div>
                              )}
                          </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── LATENCY CHART SECTION ─────────────────────────────────────

const latencyFetcher = (url: string) => fetch(url).then(r => r.json());

function LatencyChartSection({ workspaceId }: { workspaceId: number }) {
  const [timeRange, setTimeRange] = useState('15m');
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [availableHosts, setAvailableHosts] = useState<string[]>([]);

  const refreshRate = (timeRange === '15m' || timeRange === '30m') ? 3000 : 60000;

  const { data: rawData, isLoading: chartLoading, error: chartError } = useSWR(
    `/api/monitoring/latency?workspace_id=${workspaceId}&range=${timeRange}`,
    latencyFetcher,
    { refreshInterval: refreshRate }
  );

  const chartData = useMemo(() => {
    if (!rawData || rawData.error) return [];
    return rawData.map((item: Record<string, unknown>) => ({
      ...item,
      formattedTime: new Date(item.time as string).toLocaleString('id-ID', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    }));
  }, [rawData]);

  // Discover hosts from data
  useEffect(() => {
    if (!chartData || chartData.length === 0) return;
    const hosts = Array.from(
      new Set(chartData.flatMap((d: Record<string, unknown>) => Object.keys(d)))
    ).filter(key => key !== 'time' && key !== 'formattedTime') as string[];
    const sorted = hosts.sort();

    setAvailableHosts(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(sorted)) {
        if (prev.length === 0) setSelectedHosts(sorted);
        return sorted;
      }
      return prev;
    });
  }, [chartData]);

  const toggleHost = useCallback((host: string) => {
    setSelectedHosts(prev =>
      prev.includes(host) ? prev.filter(h => h !== host) : [...prev, host]
    );
  }, []);

  const getHostColor = useCallback((host: string) => {
    const index = availableHosts.indexOf(host);
    const hue = (index * (360 / Math.max(availableHosts.length, 5))) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }, [availableHosts]);

  const intervalLabel = useMemo(() => {
    switch(timeRange) {
      case '15m': return '5s Avg';
      case '30m': return '10s Avg';
      case '1h': return '30s Avg';
      case '1d': return '5m Avg';
      case '3d': return '15m Avg';
      case '7d': return '30m Avg';
      case '14d': return '1h Avg';
      default: return '5m Avg';
    }
  }, [timeRange]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-base-100/95 border border-base-300 backdrop-blur-md p-4 rounded-2xl shadow-2xl text-sm">
          <p className="text-base-content/60 mb-2 font-medium border-b border-base-300 pb-2 text-xs">{payload[0].payload.formattedTime}</p>
          {payload.map((entry: { color: string; name: string; value: number | null }, index: number) => (
            <div key={`item-${index}`} className="flex items-center gap-2 py-0.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-base-content/50 text-xs">{entry.name}:</span>
              <span className="font-bold text-base-content text-xs">
                {entry.value != null ? `${entry.value.toFixed(2)} ms` : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-base-100 rounded-[2rem] border border-base-300 p-6 md:p-8 shadow-sm relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
            <BarChart3 size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Performance Trend</h2>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5">
              {intervalLabel} · {timeRange.replace('m', ' min').replace('d', ' days')}
            </p>
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex flex-wrap bg-base-200/50 p-1 rounded-xl border border-base-300 w-fit gap-1">
          {[
            { label: '15m', value: '15m' },
            { label: '30m', value: '30m' },
            { label: '1h', value: '1h' },
            { label: '1d', value: '1d' },
            { label: '3d', value: '3d' },
            { label: '7d', value: '7d' },
          ].map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRange === range.value
                  ? 'bg-primary text-primary-content shadow-md'
                  : 'text-base-content/40 hover:text-base-content/80 hover:bg-base-300/50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Host Filters */}
      {availableHosts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {availableHosts.map((host) => {
            const isSelected = selectedHosts.includes(host);
            const color = getHostColor(host);
            return (
              <button
                key={host}
                onClick={() => toggleHost(host)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-base-200 border-base-300 text-base-content shadow-sm'
                    : 'bg-transparent border-base-300/50 text-base-content/30 hover:border-base-300'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${!isSelected && 'grayscale opacity-30'}`}
                  style={{ backgroundColor: color }}
                />
                {host}
              </button>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <div className="h-[400px] w-full">
        {chartLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-primary">
            <Activity className="animate-bounce mb-4" size={32} />
            <p className="font-bold animate-pulse text-sm">Loading chart data...</p>
          </div>
        ) : chartError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-error bg-error/5 rounded-2xl border border-error/20 p-8 text-center">
            <AlertTriangle className="mb-4" size={48} />
            <h3 className="text-lg font-black mb-2">Failed to load chart</h3>
            <p className="text-error/80 text-sm">Pastikan worker berjalan dan InfluxDB aktif.</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-base-content/40 bg-base-200/30 rounded-2xl border border-base-300/30">
            <Server className="mb-4 opacity-50" size={48} />
            <p className="font-bold">No latency data available</p>
            <p className="text-sm mt-2 opacity-60">Pastikan worker berjalan dan menulis data ke InfluxDB.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {availableHosts.map((host) => {
                  const color = getHostColor(host);
                  return (
                    <linearGradient key={`grad-${host}`} id={`color-${host.replace(/[.:]/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
              <XAxis
                dataKey="formattedTime"
                stroke="currentColor"
                opacity={0.4}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={50}
              />
              <YAxis
                stroke="currentColor"
                opacity={0.4}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => value % 1 === 0 ? `${value}ms` : `${value.toFixed(1)}ms`}
                tickMargin={10}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
              {availableHosts.map((host) => {
                if (!selectedHosts.includes(host)) return null;
                const color = getHostColor(host);
                const gradientId = `url(#color-${host.replace(/[.:]/g, '-')})`;
                return (
                  <Area
                    key={host}
                    type="monotone"
                    dataKey={host}
                    name={host}
                    stroke={color}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={gradientId}
                    activeDot={{ r: 5, strokeWidth: 0, fill: color }}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}